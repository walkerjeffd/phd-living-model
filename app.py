import os.path
from flask import Flask
from flask.ext.sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['DATABASE_FILE'] = 'sample_db.sqlite'
app.config['DATABASE_PATH'] = os.path.join(os.path.realpath(os.path.dirname(__file__)), app.config['DATABASE_FILE'])
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + app.config['DATABASE_PATH']
app.config['SQLALCHEMY_ECHO'] = True
db = SQLAlchemy(app)

# Models
class User(db.Model):
  id = db.Column(db.Integer, primary_key=True)
  email = db.Column(db.String(120), unique=True)
  password = db.Column(db.String(120))

  def __unicode__(self):
    return self.email

def build_sample_db():
  print app.config['SQLALCHEMY_DATABASE_URI']
  db.drop_all()
  db.create_all()
  user = User()
  user.email = 'walker.jeff.d@gmail.com'
  user.password = 'flask'
  db.session.add(user)
  db.session.commit()
  return

@app.route("/")
def index():
  return "Hello World"

if __name__ == '__main__':
  if not os.path.exists(app.config['DATABASE_PATH']):
    build_sample_db()

  app.run(debug=True)
