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
app.config['SQLALCHEMY_ECHO'] = True
db = SQLAlchemy(app)

# configure admin
admin = admin.Admin(app, 'WIWM')

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True)
    password = db.Column(db.String(120))

    def __unicode__(self):
        return self.email

class Watershed(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    usgs_station = db.Column(db.String(120), nullable=False)
    ghcnd_station = db.Column(db.String(120), nullable=False)

    def __unicode__(self):
        return self.name

# routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/watersheds')
def watershed_list():
    watersheds = Watershed.query.all()
    return render_template('watershed_list.html', watersheds=watersheds)

@app.route('/watersheds/<int:id>')
def watershed_detail(id):
    watershed = Watershed.query.get(id)
    return render_template('watershed_detail.html', watershed=watershed)

# admin views
admin.add_view(sqla.ModelView(User, db.session))
admin.add_view(sqla.ModelView(Watershed, db.session))

# initialize
users = [('walker.jeff.d@gmail.com', 'password')]
watersheds = [('Westfield River', '01181000', 'USC00199972')]

def build_sample_db():
    print app.config['SQLALCHEMY_DATABASE_URI']
    db.drop_all()
    db.create_all()
    for email, password in users:
        user = User()
        user.email = email
        user.password = password
        db.session.add(user)

    for name, usgs_station, ghcnd_station in watersheds:
        watershed = Watershed()
        watershed.name = name
        watershed.usgs_station = usgs_station
        watershed.ghcnd_station = ghcnd_station
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
