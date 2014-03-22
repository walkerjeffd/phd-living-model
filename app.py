import os
import sys
import requests
import json
import pandas as pd
import numpy as np
import StringIO
from ftplib import FTP
from datetime import datetime
from flask import Flask, render_template, redirect, url_for, flash, Response, send_file
from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext import admin
from flask.ext.admin.contrib import sqla
from flask.ext.restless import APIManager

app = Flask(__name__)

app.config['DEBUG'] = True

# configure sessions
app.config['SECRET_KEY'] = 'A0Zr98j/3yX R~XHH!jmN]LWX/,?RT'

# configure data
app.config['DATA_FOLDER'] = os.path.join(os.path.realpath(os.path.dirname(__file__)), 'data')

# configure SQLAlchemy
app.config['DATABASE_FILE'] = 'sample_db.sqlite'
app.config['DATABASE_PATH'] = os.path.join(app.config['DATA_FOLDER'], app.config['DATABASE_FILE'])
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + app.config['DATABASE_PATH']
app.config['SQLALCHEMY_ECHO'] = False
db = SQLAlchemy(app)

# configure admin
admin = admin.Admin(app, 'Database', base_template='admin-base.html')

# configure API manager
manager = APIManager(app, flask_sqlalchemy_db=db)

# utilities
def dataframe_count_missing(df, columns=None):
    if columns is None:
        missing = df.isnull().sum().sum()
    else:
        missing = df[columns].isnull().sum().sum()
    return missing

def dataframe_timespan(df):
    start = df.index[0]
    end = df.index[-1]
    return (start.to_timestamp(), end.to_timestamp())

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True)
    password = db.Column(db.String(120))

    def __unicode__(self):
        return self.email

class UsgsDataset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    station_id = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(200))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    created = db.Column(db.DateTime, default=db.func.now())
    updated = db.Column(db.DateTime, default=db.func.now())
    drainage_area = db.Column(db.Float)
    start_date = db.Column(db.DateTime, default=datetime(2000,1,1), nullable=False)
    end_date = db.Column(db.DateTime)
    count_missing = db.Column(db.Integer)

    def path(self):
        return os.path.join(app.config['DATA_FOLDER'], 'usgs', self.station_id)

    def path_site(self):
        return os.path.join(self.path(), 'site.rdb')

    def path_raw_json(self):
        return os.path.join(self.path(), 'dv.json')

    def path_raw_csv(self):
        return os.path.join(self.path(), 'raw.csv')

    def path_processed_csv(self):
        return os.path.join(self.path(), 'processed.csv')

    def fetch_data(self):
        if app.config['DEBUG']:
            print 'Fetching USGS data, ' + self.station_id

        if not os.path.exists(self.path()):
            os.mkdir(self.path())

        end_date =  datetime.now().date().isoformat()

        url = 'http://waterservices.usgs.gov/nwis/dv/'
        params = {'format': 'json,1.1', 
                  'parameterCd': '00060', 
                  'startDT': self.start_date.date().isoformat(), 
                  'endDT': end_date, 
                  'sites': self.station_id}

        r = requests.get(url, params=params)

        if r.ok is False:
            if app.config['DEBUG']:
                print 'Request Error %d: %s' % (r.status_code, r.reason)
            return None

        with open(self.path_raw_json(), 'w') as f:
            f.write(r.content)

        self.updated = datetime.utcnow()
        db.session.commit()

        return r

    def load_raw_data(self):
        if app.config['DEBUG']:
            print 'Getting USGS raw data, ' + self.station_id

        with open(self.path_raw_json(), 'r') as f:
            data = json.load(f)

        # get timeseries data        
        ts = data['value']['timeSeries'][0]
        nodatavalue = ts['variable']['noDataValue']

        # extract time series as lists
        dates = [value['dateTime'] for value in ts['values'][0]['value']]
        values = [float(value['value']) for value in ts['values'][0]['value'] ]

        # convert to pandas.DataFrame
        df = pd.DataFrame({'Flow_cfs': values},
                          index=pd.to_datetime(dates).to_period("D"))
        df.index = df.index.rename('Date')
        df['Date'] = [date.date().isoformat() for date in df.index.to_timestamp()]

        # replace missing values
        df['Flow_cfs'][df['Flow_cfs']==nodatavalue] = None

        return df

    def load_processed_data(self):
        if app.config['DEBUG']:
            print 'Getting USGS processed data, ' + self.station_id

        df = pd.read_csv(self.path_processed_csv(), index_col='Date', parse_dates=True)
        df.index = df.index.to_period("D")

        return df

    def process_data(self, df=None):
        if app.config['DEBUG']:
            print 'Processing USGS data, ' + self.station_id

        if df is None:
            df = self.load_raw_data()

        # trim missing values from end
        last_date = df.index[df[['Flow_cfs']].any(axis=1)].to_datetime().max()
        df = df[:last_date.isoformat()]

        # interpolate missing values
        df['Flow_cfs'] = pd.Series.interpolate(df['Flow_cfs'])

        if not self.drainage_area is None:
            df['Flow_in'] = df['Flow_cfs']/self.drainage_area*86400.*12./5280.**2
        else:
            df['Flow_in'] = np.nan

        return df

    def update_data(self, fetch=True):
        if app.config['DEBUG'] is True:
            print 'Updating USGS data, ' + self.station_id

        if fetch is True:
            self.fetch_data()

        raw_df = self.load_raw_data()
        raw_df.to_csv(self.path_raw_csv(), index=False, cols=['Date', 'Flow_cfs'])
        self.count_missing = dataframe_count_missing(raw_df, columns=['Flow_cfs'])

        processed_df = self.process_data(raw_df)
        processed_df.to_csv(self.path_processed_csv(), index=False, cols=['Date', 'Flow_cfs', 'Flow_in'])

        span = dataframe_timespan(processed_df)
        self.start_date = span[0]
        self.end_date = span[1]

        db.session.commit()

        return True

    def fetch_site(self):
        if app.config['DEBUG']:
            print 'Fetching USGS site, ' + self.station_id

        if not os.path.exists(self.path()):
            os.mkdir(self.path())

        url = 'http://waterservices.usgs.gov/nwis/site/'
        params = {'format': 'rdb', 'sites': self.station_id, 'siteOutput': 'expanded'}

        r = requests.get(url, params=params)

        if r.ok is False:
            if app.config['DEBUG']:
                print 'Request Error %d: %s' % (r.status_code, r.reason)
                print r.url
            return None

        with open(self.path_site(), 'w') as f:
            f.write(r.content)

        return r.content.split('\n')

    def load_site(self):
        # load site info from site.rdb and return dict
        if app.config['DEBUG']:
            print 'Loading USGS site, ' + self.station_id

        if not os.path.exists(self.path_site()):
            self.fetch_site()

        with open(self.path_site(), 'r') as f:
            lines = [line for line in f if line[0] != '#' and len(line.strip()) > 0]

        if len(lines) >= 3:
            header = [item.strip() for item in lines[0].split('\t')]
            row = [item.strip() for item in lines[2].split('\t')]
            site_info = dict(zip(header, row))
            return site_info

        return None

    def update_site(self):
        # Update site information
        # 1 fetch data
        # 2 convert rdb to dict
        # 3 update attributes
        if app.config['DEBUG']:
            print 'Updating USGS site, ' + self.station_id

        site_info = self.load_site()
        
        if site_info is None:
            print 'Could not load site info'
            return False

        drainage_area = site_info.get('contrib_drain_area_va')
        if drainage_area == '':
            drainage_area = site_info.get('drain_area_va')
        if drainage_area != '':
            self.drainage_area = float(drainage_area)

        if not site_info.get('dec_lat_va') in [None, '']:
            self.latitude = float(site_info.get('dec_lat_va'))
        elif not site_info.get('lat_va') in [None, '']:
            x = site_info.get('lat_va')
            d = float(x[:2])
            m = float(x[2:4])
            s = float(x[4:])
            self.latitude = d + (m + s/60.)/60.

        if not site_info.get('dec_long_va') in [None, '']:
            self.longitude = float(site_info.get('dec_long_va'))
        elif not site_info.get('long_va') in [None, '']:
            x = site_info.get('long_va')
            d = -float(x[:3])
            m = float(x[3:5])
            s = float(x[4:])
            self.longitude = d + (m + s/60.)/60.

        self.name = site_info.get('station_nm').upper()

        db.session.commit()

        return True

    def __unicode__(self):
        return self.station_id


class GhcndDataset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    station_id = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(200))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    start_date = db.Column(db.DateTime, default=datetime(2000,1,1), nullable=False)
    end_date = db.Column(db.DateTime)
    count_missing = db.Column(db.Integer)
    created = db.Column(db.DateTime, default=db.func.now())
    updated = db.Column(db.DateTime)
    
    def path(self):
        return os.path.join(app.config['DATA_FOLDER'], 'ghcnd', self.station_id)

    def path_site_list_txt(self):
        return os.path.join(app.config['DATA_FOLDER'], 'ghcnd', 'ghcnd-stations.txt')

    def path_site_list_csv(self):
        return os.path.join(app.config['DATA_FOLDER'], 'ghcnd', 'ghcnd-stations.csv')

    def path_raw_data(self):
        return os.path.join(self.path(), 'data.dly')

    def path_raw_csv(self):
        return os.path.join(self.path(), 'raw.csv')

    def path_raw_json(self):
        return os.path.join(self.path(), 'raw.json')

    def path_processed_csv(self):
        return os.path.join(self.path(), 'processed.csv')

    def fetch_data(self):
        if app.config['DEBUG']:
            print 'Fetching GHCND data, ' + self.station_id

        if not os.path.exists(self.path()):
            os.mkdir(self.path())

        ftp = FTP("ftp.ncdc.noaa.gov")
        ftp.login()
        ftp.cwd('/pub/data/ghcn/daily/all')

        filename = self.station_id + ".dly"
        
        ftp.retrbinary('RETR ' + filename, open(self.path_raw_data(), 'wb').write)
        
        self.updated = datetime.utcnow()
        db.session.commit()
        
        return True

    def fetch_site_list(self):
        if app.config['DEBUG']:
            print 'Fetching GHCND sites, ' + self.station_id

        if os.path.exists(self.path_site_list_txt()):
            return True

        ftp = FTP("ftp.ncdc.noaa.gov")
        ftp.login()
        ftp.cwd('/pub/data/ghcn/daily')

        filename = "ghcnd-stations.txt"
        
        ftp.retrbinary('RETR ' + filename, open(self.path_site_list_txt(), 'wb').write)

        return True        

    def parse_site_list(self):
        if app.config['DEBUG']:
            print 'Parsing GHCND sites, ' + self.station_id

        if not os.path.exists(self.path_site_list_txt()):
            self.fetch_site_list()

        columns = [('ID', 0, 11),
                   ('LATITUDE', 12, 20),
                   ('LONGITUDE', 21, 30),
                   ('ELEVATION', 31, 37),
                   ('STATE', 38, 40),
                   ('NAME', 41, 71),
                   ('GSNFLAG', 72, 75),
                   ('HCNFLAG', 76, 79),
                   ('WMOID', 80, 85)]
        colspecs = [(start, end) for name, start, end in columns]
        site_list = pd.read_fwf(self.path_site_list_txt(), colspecs=colspecs, header=None, index_col=None)
        site_list.columns = [name for name, start, end in columns]
        site_list.to_csv(self.path_site_list_csv())
        return True

    def load_site(self):
        if app.config['DEBUG']:
            print 'Getting GHCND sites, ' + self.station_id

        if not os.path.exists(self.path_site_list_csv()):
            self.parse_site_list()

        site_list = pd.read_csv(self.path_site_list_csv())
        site = site_list[site_list['ID'] == self.station_id].to_dict(outtype='list')

        return site

    def load_raw_data(self):
        if app.config['DEBUG']:
            print 'Getting GHCND raw data, ' + self.station_id

        if not os.path.exists(self.path_raw_data()):
            self.fetch_data()

        elements=["PRCP","TMIN","TMAX"]

        unit_converters = {
            'PRCP': lambda x: x/100./2.54, # 0.1 mm -> in
            'TMIN': lambda x: x/10.,       # 0.1 degC -> degC
            'TMAX': lambda x: x/10.        # 0.1 degC -> degC
        }

        start_columns = [
            ('ID', 0, 11, str),
            ('YEAR', 11, 15, int),
            ('MONTH', 15, 17, int),
            ('ELEMENT', 17, 21, str),
        ]

        value_columns = [
            ('VALUE', 0, 5, float),
            ('MFLAG', 5, 6, str),
            ('QFLAG', 6, 7, str),
            ('SFLAG', 7, 8, str),
        ]

        columns = start_columns
        for i in xrange(1, 32):
            columns += [(name + str(i), start+13+(8*i), end+13+(8*i), converter)
                        for name, start, end, converter in value_columns]

        colspecs = [(start, end) for name, start, end, converter in columns]

        station_data = pd.read_fwf(self.path_raw_data(), colspecs=colspecs, header=None, index_col=None, na_values=[-9999])
        station_data.columns = [name for name, start, end, converter in columns]

        dfs = {}
        for element_name, element_df in station_data.groupby('ELEMENT'):
            if not elements is None and element_name not in elements:
                continue

            element_df['MONTH_PERIOD'] = element_df.apply(lambda x: pd.Period('%s-%s' % (x['YEAR'], x['MONTH'])), axis=1)
            element_df = element_df.set_index('MONTH_PERIOD')

            monthly_index = element_df.index
            daily_index = element_df.resample('D').index.copy()

            month_starts = monthly_index.asfreq('D', how='S')
            df = pd.DataFrame(columns=['VALUE', 'MFLAG', 'QFLAG', 'SFLAG'], index=daily_index)
            df.index = df.index.rename("DATE")

            for day_of_month in range(1, 32):
                dates = [date for date in (month_starts + day_of_month - 1)
                        if date.day == day_of_month]
                if not len(dates):
                    continue
                months = pd.PeriodIndex([pd.Period(date, 'M') for date in dates])
                for column_name in df.columns:
                    col = column_name + str(day_of_month)
                    df[column_name][dates] = element_df[col][months]

            dfs[element_name] = df

        # convert units
        for element_name in dfs.keys():
            dfs[element_name]['VALUE'] = dfs[element_name]['VALUE'].apply(unit_converters.get(element_name, lambda x: x))

        # combine VALUE column for each element into single df
        df = pd.DataFrame(dict([(element_name, dfs[element_name]['VALUE']) for element_name in dfs.keys()]))

        # rename columns
        rename_columns = {
            'PRCP': 'Precip_in',
            'TMIN': 'Tmin_degC',
            'TMAX': 'Tmax_degC'
        }
        df = df.rename(columns=rename_columns)
        df.index = df.index.rename('Date')
        
        last_date = df.index[df.any(axis=1)].to_datetime().max()
        df = df[:last_date.isoformat()]

        df = df[self.start_date.isoformat():]

        df['Date'] = [date.date().isoformat() for date in df.index.to_timestamp()]

        return df

    def load_processed_data(self):
        if app.config['DEBUG']:
            print 'Getting GHCND processed data, ' + self.station_id

        df = pd.read_csv(self.path_processed_csv(), index_col='Date', parse_dates=True)
        df.index = df.index.to_period("D")

        return df

    def process_data(self, df=None):
        if app.config['DEBUG']:
            print 'Processing GHCND data, ' + self.station_id

        if df is None:
            df = self.load_raw_data()

        # trim missing values from end
        last_date = df.index[df[['Precip_in', 'Tmin_degC', 'Tmax_degC']].any(axis=1)].to_datetime().max()
        df = df[:last_date.isoformat()]

        # fill missing values
        df['Precip_in'] = df['Precip_in'].fillna(value=0)
        
        for element in ['Tmin_degC', 'Tmax_degC']:
            df[element] = pd.Series.interpolate(df[element])
        
        return df

    def update_data(self, fetch=True):
        if app.config['DEBUG']:
            print 'Updating GHCND data, ' + self.station_id

        if fetch is True:
            self.fetch_data()

        raw_df = self.load_raw_data()
        raw_df.to_csv(self.path_raw_csv(), index=False, cols=['Date', 'Precip_in', 'Tmin_degC', 'Tmax_degC'])
        self.count_missing = dataframe_count_missing(raw_df, columns=['Precip_in', 'Tmin_degC', 'Tmax_degC'])

        processed_df = self.process_data(raw_df)
        processed_df.to_json(self.path_processed_csv(), orient='records')
        processed_df.to_csv(self.path_processed_csv(), index=False, cols=['Date', 'Precip_in', 'Tmin_degC', 'Tmax_degC'])

        span = dataframe_timespan(processed_df)
        self.start_date = span[0]
        self.end_date = span[1]
        db.session.commit()

        return True
        
    def update_site(self):
        if app.config['DEBUG']:
            print 'Updating GHCND site, ' + self.station_id

        site = self.load_site()
        
        self.latitude = float(site['LATITUDE'][0])
        self.longitude = float(site['LONGITUDE'][0])
        self.name = site['NAME'][0]
        db.session.commit()

        return True

    def __unicode__(self):
        return self.station_id

class Watershed(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    start_date = db.Column(db.DateTime, default=datetime(2010,1,1))
    end_date = db.Column(db.DateTime)
    latitude = db.Column(db.Float)

    usgs_id = db.Column(db.Integer(), db.ForeignKey(UsgsDataset.id))
    ghcnd_id = db.Column(db.Integer(), db.ForeignKey(GhcndDataset.id))
    usgs = db.relationship(UsgsDataset, backref="watersheds")
    ghcnd = db.relationship(GhcndDataset, backref="watersheds")

    def path(self):
        return os.path.join(app.config['DATA_FOLDER'], 'watershed', str(self.id))
    
    def path_dataset_json(self):
        return os.path.join(self.path(), 'dataset.json')

    def path_dataset_csv(self):
        return os.path.join(self.path(), 'dataset.csv')

    def merge_dataset(self):
        if app.config['DEBUG'] is True:
            print 'Getting Watershed dataset, ' + str(self.id)

        start = self.start_date.isoformat()
        end = self.end_date.isoformat()

        usgs = self.usgs.load_processed_data()
        usgs = usgs[start:end]
        ghcnd = self.ghcnd.load_processed_data()
        ghcnd = ghcnd[start:end]

        df = usgs[['Flow_in']].merge(ghcnd[['Precip_in', 'Tmax_degC', 'Tmin_degC']], how='outer', left_index=True, right_index=True)
        df['Date'] = [date.date().isoformat() for date in df.index.to_timestamp()]

        return df

    def update(self, fetch=True):
        if not os.path.exists(self.path()):
            os.mkdir(self.path())

        self.usgs.update_data(fetch=fetch)
        self.ghcnd.update_data(fetch=fetch)
        self.end_date = min(self.usgs.end_date, self.ghcnd.end_date)
        
        db.session.commit()

        df = self.merge_dataset()
        df.to_json(self.path_dataset_json(), orient='records')
        df.to_csv(self.path_dataset_csv(), index=False, cols=['Date', 'Precip_in', 'Tmax_degC', 'Tmin_degC', 'Flow_in'])

    def __unicode__(self):
        return self.name

class Model(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    param_a = db.Column(db.Float, default=1.0)
    param_b = db.Column(db.Float, default=5)
    param_c = db.Column(db.Float, default=0.5)
    param_d = db.Column(db.Float, default=0.2)
    param_G0 = db.Column(db.Float, default=2)
    param_S0 = db.Column(db.Float, default=2)
    created = db.Column(db.DateTime, default=db.func.now())
    updated = db.Column(db.DateTime)
    cal_start = db.Column(db.DateTime)
    cal_end = db.Column(db.DateTime)
    last_start = db.Column(db.DateTime)
    last_end = db.Column(db.DateTime)
    watershed_id = db.Column(db.Integer(), db.ForeignKey(Watershed.id))
    watershed = db.relationship(Watershed, backref='models')

    def input_url(self):
        url = url_for('watershed_dataset_csv', id=self.watershed.id)
        return url

    def __unicode__(self):
        return self.name

# api endpoints
def put_single_preprocessor(data=None, **kw):
    # remove input_url from put data, causes error
    data.pop('input_url')
    return data

model_blueprint = manager.create_api(Model, methods=['GET', 'PUT'], include_methods=['input_url'], preprocessors={'PUT_SINGLE': [put_single_preprocessor]})

# routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/models')
def models():
    return render_template('models.html')

@app.route('/datasets')
def datasets():
    return render_template('datasets.html')

@app.route('/datasets/usgs')
def usgs_dataset_list():
    usgs_datasets = UsgsDataset.query.all()
    return render_template('usgs_dataset_list.html', datasets=usgs_datasets)

@app.route('/datasets/usgs/<int:id>')
def usgs_dataset_detail(id):
    usgs_dataset = UsgsDataset.query.get_or_404(id)
    return render_template('usgs_dataset_detail.html', dataset=usgs_dataset)

@app.route('/datasets/usgs/<int:id>/update/data')
def usgs_dataset_update_data(id):
    usgs_dataset = UsgsDataset.query.get_or_404(id)
    if usgs_dataset.update_data() is True:
        flash('Update data successful')
        return redirect(url_for('usgs_dataset_detail', id=id))
    else:
        flash('Update data failed')
        return redirect(url_for('usgs_dataset_detail', id=id))

@app.route('/datasets/usgs/<int:id>/update/site')
def usgs_dataset_update_site(id):
    usgs_dataset = UsgsDataset.query.get_or_404(id)
    if usgs_dataset.update_site() is True:
        flash('Update site successful')
        return redirect(url_for('usgs_dataset_detail', id=id))
    else:
        flash('Update site failed')
        return redirect(url_for('usgs_dataset_detail', id=id))
    return redirect(url_for('usgs_dataset_detail', id=id))

@app.route('/datasets/usgs/<int:id>/raw.json')
def usgs_dataset_raw_json(id):
    usgs_dataset = UsgsDataset.query.get_or_404(id)
    return send_file(usgs_dataset.path_raw_json(), mimetype='application/json')

@app.route('/datasets/usgs/<int:id>/raw.csv')
def usgs_dataset_raw_csv(id):
    usgs_dataset = UsgsDataset.query.get_or_404(id)
    return send_file(usgs_dataset.path_raw_csv(), mimetype='text/csv')

@app.route('/datasets/usgs/<int:id>/processed.csv')
def usgs_dataset_processed_csv(id):
    usgs_dataset = UsgsDataset.query.get_or_404(id)
    return send_file(usgs_dataset.path_processed_csv(), mimetype='text/csv')

@app.route('/datasets/ghcnd')
def ghcnd_dataset_list():
    ghcnd_datasets = GhcndDataset.query.all()
    return render_template('ghcnd_dataset_list.html', datasets=ghcnd_datasets)

@app.route('/datasets/ghcnd/<int:id>/update/data')
def ghcnd_dataset_update_data(id):
    ghcnd_dataset = GhcndDataset.query.get_or_404(id)
    if ghcnd_dataset.update_data() is True:
        flash('Update data successful')
        return redirect(url_for('ghcnd_dataset_detail', id=id))
    else:
        flash('Update data failed')
        return redirect(url_for('ghcnd_dataset_detail', id=id))

@app.route('/datasets/ghcnd/<int:id>/update/site')
def ghcnd_dataset_update_site(id):
    ghcnd_dataset = GhcndDataset.query.get_or_404(id)
    
    if ghcnd_dataset.update_site() is True:
        flash('Update site successful')
        return redirect(url_for('ghcnd_dataset_detail', id=id))
    else:
        flash('Update site failed')
        return redirect(url_for('ghcnd_dataset_detail', id=id))

    return redirect(url_for('ghcnd_dataset_detail', id=id))

@app.route('/datasets/ghcnd/<int:id>')
def ghcnd_dataset_detail(id):
    ghcnd_dataset = GhcndDataset.query.get_or_404(id)
    return render_template('ghcnd_dataset_detail.html', dataset=ghcnd_dataset)

@app.route('/datasets/ghcnd/<int:id>/raw.dly')
def ghcnd_dataset_raw_txt(id):
    ghcnd_dataset = GhcndDataset.query.get_or_404(id)
    return send_file(ghcnd_dataset.path_raw_data(), mimetype='text/plain')

@app.route('/datasets/ghcnd/<int:id>/raw.csv')
def ghcnd_dataset_raw_csv(id):
    ghcnd_dataset = GhcndDataset.query.get_or_404(id)
    return send_file(ghcnd_dataset.path_raw_csv(), mimetype='text/csv')

@app.route('/datasets/ghcnd/<int:id>/processed.csv')
def ghcnd_dataset_processed_csv(id):
    ghcnd_dataset = GhcndDataset.query.get_or_404(id)
    return send_file(ghcnd_dataset.path_processed_csv(), mimetype='text/csv')

@app.route('/datasets/watersheds')
def watershed_list():
    watersheds = Watershed.query.all()
    return render_template('watershed_list.html', watersheds=watersheds)

@app.route('/datasets/watersheds/<int:id>')
def watershed_detail(id):
    watershed = Watershed.query.get_or_404(id)
    return render_template('watershed_detail.html', watershed=watershed)

@app.route('/datasets/watersheds/<int:id>/update')
def watershed_update(id):
    watershed = Watershed.query.get_or_404(id)
    watershed.update()
    flash('Update successful')
    return redirect(url_for('watershed_detail', id=id))

@app.route('/datasets/watersheds/<int:id>/dataset.json')
def watershed_dataset_json(id):
    watershed = Watershed.query.get_or_404(id)
    return send_file(watershed.path_dataset_json(), mimetype='application/json')

@app.route('/datasets/watersheds/<int:id>/dataset.csv')
def watershed_dataset_csv(id):
    watershed = Watershed.query.get_or_404(id)
    return send_file(watershed.path_dataset_csv(), mimetype='text/csv')

# admin views
class USGSAdminView(sqla.ModelView):
    form_create_rules = ('station_id', 'start_date')

    def after_model_change(self, form, model, is_created):
        if is_created is True:
            model.update_site()
            model.update_data()

class GHCNDAdminView(sqla.ModelView):
    form_create_rules = ('station_id', 'start_date')

    def after_model_change(self, form, model, is_created):
        if is_created is True:
            model.update_site()
            model.update_data()

class WatershedAdminView(sqla.ModelView):
    form_create_rules = ('name', 'start_date', 'usgs', 'ghcnd')

    def after_model_change(self, form, model, is_created):
        print "CREATED"
        print model
        if is_created is True:
            model.latitude = model.usgs.latitude
            db.session.commit()
            model.update()

class ModelAdminView(sqla.ModelView):
    form_create_rules = ('name', 'watershed')

# admin.add_view(sqla.ModelView(User, db.session))
admin.add_view(ModelAdminView(Model, db.session))
admin.add_view(WatershedAdminView(Watershed, db.session))
admin.add_view(USGSAdminView(UsgsDataset, db.session))
admin.add_view(GHCNDAdminView(GhcndDataset, db.session))

# initialize
def create_watershed(name, usgs_station, ghcnd_station):
    if app.config['DEBUG'] is True:
        print 'Creating Watershed: %s, %s, %s' % (name, usgs_station, ghcnd_station)

    usgs_dataset = UsgsDataset()
    usgs_dataset.station_id = usgs_station
    db.session.add(usgs_dataset)
    usgs_dataset.update_site()

    ghcnd_dataset = GhcndDataset()
    ghcnd_dataset.station_id = ghcnd_station
    db.session.add(ghcnd_dataset)
    ghcnd_dataset.update_site()

    watershed = Watershed()
    watershed.name = name
    watershed.latitude = usgs_dataset.latitude
    watershed.usgs = usgs_dataset
    watershed.ghcnd = ghcnd_dataset
    db.session.add(watershed)

    db.session.commit()

    watershed.update()

    return watershed


def build_sample_db():
    print 'Building sample db'
    users = [('walker.jeff.d@gmail.com', 'password')]
    watersheds = [('Aberjona River (MA)', '01102500', 'USC00196783'),]
                  # ('West Branch Westfield River (MA)', '01181000', 'USC00199972'),
                  # ('Little Androscoggin River (ME)', '01057000', 'USC00170844'),
                  # ('Independence River (NY)', '04256000', 'USC00308248')]

    db.drop_all()
    db.create_all()
    for email, password in users:
        user = User()
        user.email = email
        user.password = password
        db.session.add(user)

    for name, usgs_station, ghcnd_station in watersheds:
        watershed = create_watershed(name, usgs_station, ghcnd_station)

        model = Model(name=name, watershed=watershed)
        db.session.add(model)
    
    db.session.commit()
    return

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'db':
        build_sample_db()
    else:
        app.run(debug=True)
