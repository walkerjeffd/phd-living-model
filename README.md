Living Model
============

A demonstration of the Living Model concept where a client-side web application provides an interactive and visual modeling interface, and is coupled to a server-side web application designed to fetch, process, and manage input datasets retrieved using web services.

This project is part of PhD research by Jeffrey D. Walker, Tufts University. For more information about this research, see http://phd.walkerjeff.com

## Code Overview

This repository contains the following:

- `static-src/` the front-end and source code for the client-side web application built with backbone.js and require.js
- `templates/` view templates used by the server-side flask application
- `app.py` main server-side application file developed using flask
- `settings_default.py` a default settings file used to configure the secret key of the application (see Settings File below)
- `requirements.txt` pip requirements file for obtaining the python dependencies

Installation
------------

Set up a new virtual environment using [virtualenv](https://pypi.python.org/pypi/virtualenv) (see website for installation instructions).

```shell
virtualenv env
```

Activate virtualenv

```shell
source enc\bin\activate  # other
env\Scripts\activate.bat # windows
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

Then install flask using pip

```shell
pip install flask
```

## Dependencies

The server-side application requires a set of python packages listed in the `requirements.txt` file. Use pip to install these packages:

```shell
pip install -r requirements.txt
```

Require.js is used to optimize (i.e. uglify, minimify, concat) the client-side source code. The optimization configuration is deifned in the /static-src/js/app.build.js file.

Node is required, which can be downloaded here: http://nodejs.org/

## Settings File

You must also create a settings.py file using the setting_default.py example file:

```shell
cp settings_default.py settings.py
```

Open the settings.py file in a text editor and set the secret key (see the (Flask Quick Start)[http://flask.pocoo.org/docs/quickstart/#sessions] for info on generating a randomized secret key), a user email, and a password. The email and password are used to create a User account for the Admin page and Database API.

## Building

Before running the application, you must build the client-side application files, which are located in `static-src/`.

Assuming node.js is installed and the r.js file is located in the root directory, run this command:

```shell
node r.js -o ../../static-src/js/app.build.js
```

This will run in the require.js optimizer and place the built client-side code in the `static/` folder, which is used by the flask application.

## Creating A Sample Database

To create a sample database that will contain four example watersheds, run this command which executes the `build_sample_db()` function in `app.py`:

```shell
python app.py db
```

## Development Server

After building the client-side application code and creating the settings.py file, you can run the application locally by:

```shell
python app.py
```