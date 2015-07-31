# encoding: UTF-8

# Author: Carlos Xavier Hernández <cxh@stanford.edu>
# Copyright (c) 2015, Stanford University
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are
# met:
#
#   Redistributions of source code must retain the above copyright notice,
#   this list of conditions and the following disclaimer.
#
#   Redistributions in binary form must reproduce the above copyright
#   notice, this list of conditions and the following disclaimer in the
#   documentation and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
# IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
# TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
# PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
# HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
# TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
# PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
# LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
# NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
# SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

# -----------------------------------------------------------------------------
# IMPORTS
# -----------------------------------------------------------------------------

import os
import uuid
import time
import json
import tornado
import optparse
import tornado.ioloop
import scipy.io as sio
from scipy import sparse
from StringIO import StringIO
from pymongo import Connection, MongoClient
from itertools import combinations
from tornado.httpclient import AsyncHTTPClient
from tornado.web import (RequestHandler, StaticFileHandler)

# Set up MONGO CLIENT
__DB__ = 'MONGOLAB_URI'

# Declare async
HTTP_CLIENT = AsyncHTTPClient()

# -----------------------------------------------------------------------------
# TASKS
# -----------------------------------------------------------------------------


# Connect to MONGODB
def connect_to_mongo():
    if __DB__ in os.environ.keys():
        db = MongoClient(os.environ[__DB__],
                         connectTimeoutMS=30000,
                         socketTimeoutMS=None,
                         socketKeepAlive=True).get_default_database()
    else:
        print "if youre developing locally, you need to get the MONGOLAB_URI"
        print 'env variable. run "heroku config" at the command line and'
        print 'it should give you the right string'
        db = Connection().app
    # THIS IS APP SPECIFIC. PLEASE CHANGE APPLICATION ID.
    return db


# MAKES MSM GRAPH AND RETURNS JSON
def make_json(w):
    data = []
    for i, j in combinations(range(w.shape[0]), 2):
        data.append({
                    'source': i,
                    'target': j,
                    'flow1': w[i, j],
                    'flow2': w[j, i]
                    })
    return json.dumps(data)


# GET USER OPTIONS
def parse_cmdln():
    parser = optparse.OptionParser()
    parser.add_option('-p', '--port', dest='port', type='int', default=5000)
    (options, args) = parser.parse_args()
    return (options, args)

DATABASE = connect_to_mongo()
print DATABASE.collection_names()


# CREATES HOST SESSION AND LOGS USER IP INFO
class Session(object):
    """REALLLY CRAPPY SESSIONS FOR TORNADO VIA MONGODB
    """
    collection = DATABASE.sessions

    def __init__(self, request):
        data = {
            'ip_address': request.remote_ip,
            'user_agent':  request.headers.get('User-Agent')
        }
        result = self.collection.find_one(data)
        if result is None:
            # create new data
            self.collection.insert(data)
            self.data = data
        else:
            self.data = result

    def get(self, attr, default=None):
        return self.data.get(attr, default)

    def put(self, attr, value):
        self.collection.remove(self.data)
        self.data[attr] = value
        self.collection.insert(self.data)

    def __repr__(self):
        return str(self.data)


# PREVENTS FREQUENT REQUESTS
class RunHandler(RequestHandler):
    # how often should we allow execution
    max_request_frequency = 10  # seconds

    def log(self, msg):
        print msg

    def get(self):
        if self.validate_request_frequency():
            request_id = str(uuid.uuid4())
            HTTP_CLIENT.fetch('localhost', method='POST', callback=self.log)
            self.write(request_id)

    def validate_request_frequency(self):
        """Check that the user isn't requesting to run too often"""
        session = Session(self.request)
        last_run = session.get('last_run')
        if last_run is not None:
            if (time.time() - last_run) < self.max_request_frequency:
                self.write("You're being a little too eager, no?")
                return False
        session.put('last_run', time.time())

        return True


# COUNTS REQUESTS
class IndexHandler(StaticFileHandler):
    def get(self):
        session = Session(self.request)
        session.put('indexcounts', session.get('indexcounts', 0) + 1)
        return super(IndexHandler, self).get('index.html')


# HANDLES UPLOADED CONTENT
class UploadHandler(tornado.web.RequestHandler):
    def post(self):
        io = StringIO(self.get_argument('matrix'))
        w = sparse.csr_matrix(sio.mmread(io))
        w /= w.max()
        self.write(make_json(w))

# -----------------------------------------------------------------------------
# STATIC CONTENT DECLARATIONS
# -----------------------------------------------------------------------------
application = tornado.web.Application([
    (r'/run', RunHandler),
    (r"/process", UploadHandler),
    (r'/', IndexHandler, {'path': 'public'}),
    (r'/js/(.*)', StaticFileHandler, {'path': 'public/js'}),
    (r'/css/(.*)', StaticFileHandler, {'path': 'public/css'}),
    (r'/data/(.*)', StaticFileHandler, {'path': 'public/data'}),
    ], debug=True)

# -----------------------------------------------------------------------------
# MAIN
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    (options, args) = parse_cmdln()
    port = int(os.environ.get('PORT', options.port))
    application.listen(port)
    print "mutinf-viewer is starting on port %s" % options.port
    tornado.ioloop.IOLoop.instance().start()
