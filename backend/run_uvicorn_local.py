import os
import sys
backend_dir = os.path.dirname(__file__)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import uvicorn

if __name__ == '__main__':
    # Use port 8000 with binding to specific IP
    uvicorn.run('app.main:app', host='0.0.0.0', port=8000, log_level='info', reload=True)
