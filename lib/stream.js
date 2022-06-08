var Readable      = require('stream').Readable;
var util          = require('util');
var child_process = require('child_process');
var spawn = child_process.spawn;

var UnCompressStream = function (options) {
  Readable.call(this);
  this.options = options;
  this._errormsg = '';
};
util.inherits(UnCompressStream, Readable);

UnCompressStream.prototype._read = function () {
  var self = this;
  if (!self._spawned) {
    self._spawn();
    self._spawned = true;
  }
  var chunk = self._uncompress.stdout.read();
  if (chunk === null) {
    return self.push('');
  }
  self.push(chunk);
};

UnCompressStream.prototype._spawn = function () {
  var self = this;

  var args = {
        rar:['p',
             '-n' + self.options.entryname, //Specify file
             '-idq'],                       //Disable messages
        zip:['-p' ,
             self.options.filepath ,        //zip filename
             self.options.entryname]        //Specify file
      };

  if(self.options.type=='rar'){
    args.rar = args.rar.concat(self.options.arguments);
    args.rar.push(self.options.filepath);
  }

  self._uncompress = spawn(self.options.path+'\\lib\\tools\\un'+self.options.type, args[self.options.type]);

  self._uncompress.stderr.on('readable', function () {
    var chunk;
    while ((chunk = this.read()) !== null) {
      self._errormsg += chunk.toString();
    }
  });

  self._uncompress.stdout.on('end', function () {
    self.push(null);
    self.emit('run');
  });

  self._uncompress.stdout.on('readable', function () {
    self.read(0);
  });

  self._uncompress.on('exit', function (code) {
    if (code !== 0 || self._errormsg) {
      var msg = 'Un'+self.options.type+' terminated with code ' + code + '\n';

      if (code === 10) {
        msg = 'There is no such entry: ' + self.options.entryname + '\n' + msg;
      }

      msg += self._errormsg;
      var error = new Error(msg);
      error.exitCode = code;
      self.emit('error', error);
    }
    self.emit('close');
  });
};

module.exports = UnCompressStream;
