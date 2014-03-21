import sys, os
INTERP = os.path.join(os.environ['HOME'], 'living.walkerjeff.com', 'env', 'bin', 'python')

if sys.executable != INTERP:
    os.execl(INTERP, INTERP, *sys.argv)
sys.path.append(os.getcwd())
 
from living.app import app as application
