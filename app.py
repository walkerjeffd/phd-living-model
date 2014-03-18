import os.path
import sys
from flask import Flask, render_template
from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext import admin
from flask.ext.admin.contrib import sqla

app = Flask(__name__)

# configure SQLAlchemy
app.config['DATABASE_FILE'] = 'sample_db.sqlite'
app.config['DATABASE_PATH'] = os.path.join(os.path.realpath(os.path.dirname(__file__)), app.config['DATABASE_FILE'])
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + app.config['DATABASE_PATH']
app.config['SQLALCHEMY_ECHO'] = False
db = SQLAlchemy(app)

# configure admin
admin = admin.Admin(app, 'WIWM')

# configure data
app.config['DATA_FOLDER'] = os.path.join(os.path.realpath(os.path.dirname(__file__)), 'data')

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True)
    password = db.Column(db.String(120))

    def __unicode__(self):
        return self.email

class UsgsDataset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    station_id = db.Column(db.String(120), nullable=False)

    def fetch_data(self):
        print 'Getting data...'
        return [0, 1, 2]

    def raw_path(self):
        return os.path.join(app.config['DATA_FOLDER'], 'usgs', self.station_id + '.json')

    def __unicode__(self):
        return self.station_id

class GhcndDataset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    station_id = db.Column(db.String(120), nullable=False)

    def __unicode__(self):
        return self.station_id

class Watershed(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)

    usgs_dataset_id = db.Column(db.Integer(), db.ForeignKey(UsgsDataset.id), nullable=False)
    ghcnd_dataset_id = db.Column(db.Integer(), db.ForeignKey(GhcndDataset.id), nullable=False)
    usgs = db.relationship(UsgsDataset, backref="watersheds")
    ghcnd = db.relationship(GhcndDataset, backref="watersheds")

    def __unicode__(self):
        return self.name


# routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/usgs_datasets')
def usgs_dataset_list():
    usgs_datasets = UsgsDataset.query.all()
    return render_template('usgs_dataset_list.html', datasets=usgs_datasets)

@app.route('/usgs_datasets/<int:id>')
def usgs_dataset_detail(id):
    usgs_dataset = UsgsDataset.query.get(id)
    return render_template('usgs_dataset_detail.html', dataset=usgs_dataset)

@app.route('/ghcnd_datasets')
def ghcnd_dataset_list():
    ghcnd_datasets = GhcndDataset.query.all()
    return render_template('ghcnd_dataset_list.html', datasets=ghcnd_datasets)

@app.route('/ghcnd_datasets/<int:id>')
def ghcnd_dataset_detail(id):
    ghcnd_dataset = GhcndDataset.query.get(id)
    return render_template('ghcnd_dataset_detail.html', dataset=ghcnd_dataset)

@app.route('/watersheds')
def watershed_list():
    watersheds = Watershed.query.all()
    return render_template('watershed_list.html', watersheds=watersheds)

@app.route('/watersheds/<int:id>')
def watershed_detail(id):
    watershed = Watershed.query.get(id)
    return render_template('watershed_detail.html', watershed=watershed)

# admin views
# class WatershedAdmin(sqla.ModelView):
#     inline_models = [(UsgsDataset, dict(form_columns=['station_id']))]

admin.add_view(sqla.ModelView(User, db.session))
admin.add_view(sqla.ModelView(Watershed, db.session))
# admin.add_view(WatershedAdmin(Watershed, db.session))
admin.add_view(sqla.ModelView(UsgsDataset, db.session))
admin.add_view(sqla.ModelView(GhcndDataset, db.session))

# initialize
def build_sample_db():
    print 'Building sample db'
    users = [('walker.jeff.d@gmail.com', 'password')]
    watersheds = [('Westfield River', '01181000', 'USC00199972')]

    db.drop_all()
    db.create_all()
    for email, password in users:
        user = User()
        user.email = email
        user.password = password
        db.session.add(user)

    for name, usgs_station, ghcnd_station in watersheds:
        usgs_dataset = UsgsDataset()
        usgs_dataset.station_id = usgs_station
        db.session.add(usgs_dataset)

        ghcnd_dataset = GhcndDataset()
        ghcnd_dataset.station_id = ghcnd_station
        db.session.add(ghcnd_dataset)
        # db.session.commit()

        watershed = Watershed()
        watershed.name = name
        watershed.usgs = usgs_dataset
        watershed.ghcnd = ghcnd_dataset

        db.session.add(watershed)
        db.session.commit()
    return

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'clean':
        build_sample_db()

    if not os.path.exists(app.config['DATABASE_PATH']):
        print 'Building database'
        build_sample_db()

    app.run(debug=True)
