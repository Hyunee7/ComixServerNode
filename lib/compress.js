var path = require('path');
var child_process = require('child_process');
var exec = child_process.exec;

var UnCompressStream = require('./stream.js');

var UnCompress = function(options) {
  this._arguments = options.arguments || [];
  this._filepath  = options.file || options;
  this.path       = options.path.replace(/\//g,'\\') || '.';
  this.type='';
  if(path.extname(this._filepath).toUpperCase() == '.ZIP') this.type='zip';
  if(path.extname(this._filepath).toUpperCase() == '.RAR') this.type='rar';
  this._failOnPasswords = options.failOnPasswords || false;
};


/**
 * Lists entries of archive
 * @param  {Function} done Callback
 * @return {Array}         Entries
 */
UnCompress.prototype.list = function(done) {
  var self = this;

  if(this.type=='') return false;
  var __arg = {
        zip : ['-l'],
        rar : ['vt', '-v']
  };
  var child = self._exec(__arg[this.type], function(err, stdout) {
    if (err) {
      return done(err);
    }

    var chunks;
    var list;
    if(self.type=='zip'){
        chunks = stdout.split(/\r?\n/);
        chunks=chunks.slice(3, chunks.length - 3);
        compressType = self.type;
        list = chunks.map(extractProps);
    }else{ // rar
        chunks = stdout.split(/\r?\n\r?\n/);
        chunks.slice(2, chunks.length - 1);
        compressType = self.type;
        list = chunks.map(extractProps);

        // Filter & Remove dublicates
        var unique = {};
        for (i = 0, n = list.length; i < n; i++) {
          var item = list[i];
          if (item.name && item.ratio !== "-->" && item.ratio !== "<->") // Only proper items
            unique[fileId(item)] = item;
        }
        var i = 0;
        list = [];
        for (var item in unique) {
          list[i++] = unique[item];
        }
        // End Filter & Remove dublicates
    }
    done(null, list);
  });

  child.stderr.on('data', function(data) {
    if (data.toString().trim().indexOf('Enter password') === 0) {
      child.kill();
      done(new Error('Password protected file'));
    }
  })
};

/**
 * Creates readable stream of entry
 * @param  {String} entryname Name of entry
 * @return {Object}           Readable stream
 */
UnCompress.prototype.stream = function(entryname) {
  return new UnCompressStream({
    entryname: entryname,
    filepath: this._filepath,
    arguments: this._arguments,
    type:this.type,
	path:this.path
  });
};
/**
 * Executes UnCompress
 * @private
 * @param  {Array}    args Arguments
 * @param  {Function} done Callback
 * @return {ChildProcess}
 */
UnCompress.prototype._exec = function(args, done) {
  var self = this;
  
  args = args.concat(self._arguments);
  // unrar %1 %2 %3 | iconv -c -f euc-kr -t utf-8
  var path = self.path + '\\lib\\tools\\';
//  var path = '';
  var command =
    path + 'un'+this.type+' ' +
    args.join(' ') +
    ' "' + self._filepath + '" ' +
    '| ' + path + 'iconv -c -f euc-kr -t utf-8';
//  return exec(command, function(err, stdout, stderr) {
  return exec(command, {maxBuffer: 300*1024}, function(err, stdout, stderr) { // 일부 읽지 못하는 파일이 있어 버퍼 늘림.
    if (err) {
      return done(err);
    }
    if (stderr.length > 0) {
      return done(new Error(stderr));
    }
    if (stdout.length > 0 && stdout.match(/.*is not [ZIPRA]{3} archive.*/g)) {
      return done(new Error('Unsupported '+this.type.toUpperCase()+' file.'));
    }
    if (stdout.length > 0 && stdout.match(/.*Checksum error in the encrypted file.*/g)) {
      return done(new Error('Invalid Password.'));
    }
    if (self._failOnPasswords && stdout.match(/.*Flags: encrypted.*/g)) {
      return done(new Error('Password protected file'));
    }
    done(null, stdout);
  });

};

/**
 * Generate unique Identifier per File
 * @param {Object} item
 * @return {String} id
 */
function fileId(item) {
  return [item.name, item.type, item.crc32].join("-");
}

/**
 * Normalizes description of entry
 * @param  {Buffer} raw Chunk
 * @return {Object} Parsed description
 */
var compressType = 'zip';
function extractProps(raw) {
  var desc = {};

  var props = raw.split(/\r?\n/);
  props.forEach(function(prop) {
    var key = 'name';
    if(compressType=='zip'){
        prop = prop.split(/\d{2}\:\d{2}.{3}/); // /00:00   /
    }else{ // rar
        prop = prop.split(': ');
        key = normalizeKey(prop[0]);
    }
    var val = prop[1];
    desc[key] = val;
  });

  return desc;
}


/**
 * Normalizes keys of entry description
 * @param  {String} key Raw key
 * @return {String}     Normalized key
 */
function normalizeKey(key) {
  var normKey = key;
  normKey = normKey.toLowerCase();
  normKey = normKey.replace(/^\s+/, '');

  var keys = {
    'name': 'name',
    'type': 'type',
    'size': 'size',
    'packed size': 'packedSize',
    'ratio': 'ratio',
    'mtime': 'mtime',
    'attributes': 'attributes',
    'crc32': 'crc32',
    'host os': 'hostOS',
    'compression': 'compression',
    'flags': 'flags'
  };
  return keys[normKey] || key;
}

module.exports = UnCompress;
