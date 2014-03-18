import os.path
import sys
from flask import Flask
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
admin = admin.Admin(app, 'Example')

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True)
    password = db.Column(db.String(120))

    def __init__(self, email, password):
        self.email = email
        self.password = password

    def __unicode__(self):
        return self.email

@app.route('/')
def index():
  return '<a href="/admin/">Click me to get to Admin!</a>'

# admin views
admin.add_view(sqla.ModelView(User, db.session))

# initialize
def build_sample_db():
      print app.config['SQLALCHEMY_DATABASE_URI']
      db.drop_all()
      db.create_all()
      user = User('walker.jeff.d@gmail.com', 'password')
      db.session.add(user)
      db.session.commit()
      return


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'clean':
        build_sample_db()

    if not os.path.exists(app.config['DATABASE_PATH']):
        build_sample_db()

    app.run(debug=True)
