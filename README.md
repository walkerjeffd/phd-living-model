Living Model
============

A demonstration of the Living Model concept where a client-side web application provides an interactive and visual modeling interface, and is coupled to a server-side web application designed to fetch, process, and manage input datasets retrieved using web services.

This project is part of PhD research by Jeffrey D. Walker, Tufts University. For more information about this research, see http://phd.walkerjeff.com

## Code Overview

This repository contains the following:

- `static-src/` the front-end HTML/CSS/JS code, including source code for the client-side web application built with backbone.js and require.js
- `templates/` view templates used by the server-side flask application
- `app.py` main server-side flask application file
- `settings_default.py` a default settings file used to configure the application (see Flask Settings File below)
- `requirements.txt` pip requirements file for obtaining the python dependencies

Python Dependencies
------------

### Simple Method

If you do not want to set up a virtual environment through the Preferred Method below, simply install the packages listed in `requirements.txt` using whatever method you prefer (pip, easy_install, binaries, etc).

### Preferred Method

This is the preferred method that involves setting up a python virtual environment.

Set up a new virtual environment using [virtualenv](https://pypi.python.org/pypi/virtualenv) (see website for installation instructions).

```shell
virtualenv env
```

Activate virtualenv

```shell
source env/bin/activate  # other
env/Scripts/activate.bat # windows
```

If using a Linux, Unix or Mac OSX, install dependencies simply using the `requirements.txt` file (note I have not tested this):

```shell
pip install -r requirements.txt
```

If using Windows, installation of numpy, pandas, IPython is a bit more complicated and often doesn't work smoothly using pip. 

You will probably need to install Visual Studio 2008 Express to compile some source code, get it at [FreewareUpdate](http://win.freewareupdate.com/download-visual-studio-express/10002/). Probably should reboot after installation.

First install numpy after reading this [stackoverflow answer](http://stackoverflow.com/questions/6114115/windows-virtualenv-pip-numpy-problems-when-installing-numpy).

1. Download `numpy` executable from SourceForge <http://sourceforge.net/projects/numpy/>  
2. Extract `numpy-1.8.0-win32-superpack-python2.7.exe` using [7-zip](http://www.7-zip.org/)  
3. Install the SSE3 version of numpy

```shell
easy_install numpy-1.8.0-sse3.exe
```

Then install `pandas` and `ipython` using `easy_install`

```shell
easy_install pandas
easy_install ipython
```

To use IPython notebooks, you may also need to install `pyzmq` and `tornado`, which should work with pip (assuming your Visual Studio installation is working).

```shell
pip install pyzmq
pip install tornado
```

Then install flask and flask extensions in `requirements.txt` using pip

```shell
pip install -r requirements.txt
```

JavaScript Dependencies
-----------------------

Require.js is used to optimize (i.e. uglify, minimify, concat) the client-side source code. The optimization configuration is defined in the '/static-src/js/app.build.js' file (read more [here](http://requirejs.org/docs/optimization.html)).

Node must be installed, see the instructions here: http://nodejs.org/

Download the require.js optimization file [r.js](http://requirejs.org/docs/download.html#rjs) and save it to the root of this directory

Flask Settings File
-------------------

You must also create a settings.py file using the setting_default.py example file:

```shell
cp settings_default.py settings.py
```

Open the settings.py file in a text editor and set:

- `SECRET_KEY`, see the [Flask Quick Start](http://flask.pocoo.org/docs/quickstart/#sessions) for info on generating a randomized secret key
- `USER_EMAIL`, your email address
- `USER_PASSWORD`, a password

The email and password are used to create a User account for the Admin page and Database API when setting up a sample database (see Creating A Sample Database below).

Building Static Files
---------------------

The Flask application expects all front-end code to be located in the `static/` folder, which is created from the source code in the `static-src/` folder by the require.js optimizer.

To biuld the `/static` folder (assuming node.js is installed and the r.js file is located in the root directory), run this command:

```shell
node r.js -o ../../static-src/js/app.build.js
```

This will run in the require.js optimizer and place the built client-side code in the `static/` folder, which is used by the flask application.

If you make updates to the front-end code in `static-src/` then be sure to re-run the r.js command above. Or, alternatively, change the static folder of the application to point to `static-src/` instead of the default `static/`

```python
app = Flask(__name__, static_folder='static-src') # top of app.py
```

## Creating A Sample Database

After creating the `settings.py` file and building the front-end static code, create a sample database that will contain four example watersheds.

This command will execute the `build_sample_db()` function in `app.py` and create a folder `data/` that will hold the database and raw data files.

```shell
python app.py db
```

## Running the Application

After building the static folder, creating the settings.py file, and creating a sample database, run the application on a local development server.

```shell
python app.py
```