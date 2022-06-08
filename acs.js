/******************************************************************************
 * AirComicsServer Node.JS 버전
 *-----------------------------------------------------------------------------
 * Version : v2.3
 * 기능 : - AirComics(Plus) 앱의 서버 대응
 *        - ZIP 파일 지원
 *        - RAR 파일 지원
 *        - 한글 지원
 *        - 설정파일 수정으로 환경설정 가능
 *-----------------------------------------------------------------------------
 * port         : 포트지정 변수 (기본:31257)
 * documentRoot : AirComicsServer 의 Root 가 될 디렉토리
 * serverRoot   : AirComicsServer 가 설치 될 디렉토리
 *-----------------------------------------------------------------------------
 * 설치
 *   0. 예시 - 서버포트    : 31257
 *             서버위치    : c:\AirComicsServer
 *             Comics 위치 : d:\Comics
 *   1. https://nodejs.org/ko/ 에서 Node.JS를 다운받아 설치 함
 *   2. 서버 디렉토리 생성 (ex: c:\AirComicsServer)
 *   3. 압축 해제한 파일들을 서버디렉토리로 옮김 (ex: c:\AirComicsServer)
 *   4. config.js 수정
 *      port         : 사용할 포트 (ex: port=31257)
 *      documentRoot : Comics 위치 (ex: documentRoot='d:/Comics')
 *      serverRoot   : 서버위치    (ex: serverRoot='c:/AirComicsServer')
 *   5. 도스창에서 실행 (ex: node c:\AirComicsServer\acs)
 *      
 ******************************************************************************/


/******************************************************************************
 * 전역변수(실 설정값은 config.js 로 넘어감.)
 ******************************************************************************/
var config = require('./config.js'  );
var port          = config.port;           // 사용할 포트번호
var serverRoot    = config.serverRoot;     // 서버(acs.js)위치
var documentRoot  = config.documentRoot;   // Comics 기본 경로
var documentRoots = config.documentRoots;  // Comics 여러 경로
var isDocumentRoots = false;               // Comics 여러 경로 사용여부
if(config.documentRoots.length) isDocumentRoots=true;

/*----------------------------------------------------------------------------*/
var passName = config.passName;            // 압축파일내 제외할 항목
var hideList = config.hideList;            // 파일/디렉토리 목록에서 숨길항목
/*----------------------------------------------------------------------------*/
var isWin = true; // 아직 사용않음.


/******************************************************************************
 * 참조할 라이브러리
 ******************************************************************************/
var fs   = require('fs'  );
var http = require('http');
var util = require('util');

// zip, rar 대응 라이브러리
// 외부툴 사용(unzip.exe, unrar.exe, iconv.exe, iconv.dll)
// unzip : http://stahlworks.com/dev/unzip.exe
// unrar : https://www.rarlab.com/rar/unrarw32.exe 설치필요
// 한글깨짐 으로 window용 iconv 설치 : https://m.blog.naver.com/onlyu/60168520938
// 툴경로 : lib/tools
var Compress = require('./lib/compress.js');

// 서버 채크용
var os = require('os');
//console.log("Platform: " + os.platform());
//console.log("Architecture: " + os.arch());
isWin = (os.platform().indexOf('win')==-1)?false:true;


/******************************************************************************
 * 함수
 ******************************************************************************/
String.prototype.format = function() {             // 숫차포멧변환 3자리 마다 ',' 추가
	if(isNaN(this)) return this;
	var reg = /(^[+-]?\d+)(\d{3})/;                // 정규식정의
	this.rep = this + '';                          // 문자로 변환
	while (reg.test(this.rep)) this.rep = this.rep.replace(reg, '$1' + ',' + '$2');
	return this.rep;
}
Number.prototype.format = function() {             // 숫차포멧변환 3자리 마다 ',' 추가
	if(isNaN(this)) return this;
	return (this + '').format();
}
Number.prototype.to2=function(){return this<10?'0'+this:this;} // 숫자 2자리
Date.prototype.getDTTM = function(){ // 로그용 YYYY-MM-DD HH:Mi:SS.sss 형식 시각
    with(this){
        return getFullYear() + '-' + (getMonth()+1).to2() + '-' + getDate().to2()
             + ' '
             + getHours().to2() + ':' + getMinutes().to2() + ':' + getSeconds().to2()
             + '.' + getMilliseconds();
    }
}
Date.prototype.getDTTM2 = function(){ // 로그용 YYYY-MM-DD HH:Mi:SS.sss 형식 시각
    with(this){
        return getFullYear() + (getMonth()+1).to2() + getDate().to2()
             + '.'
             + getHours().to2() + getMinutes().to2() + getSeconds().to2()
             + '(' + getMilliseconds() + ')';
    }
}
String.prototype.isPass = function (){ // 제외단어 처리
    var r = false;
    for(var i=0; i<passName.length; i++){
        if(this.toUpperCase().indexOf(passName[i])>=0){
            r=true;
            break;
        }
    }
    return r;
}
String.prototype.isHide = function(){ // 숨김단어 처리
    var r = false;
    for(var i=0; i<hideList.length; i++){
        if(this == hideList[i]){
            r=true;
            break;
        }
    }
    return r;
}
String.prototype.getContentType = function(){ // ContentType 설정
    var extname = require('path').extname(''+this); // 확장문자 추출
    var contentType = 'text/html';
    switch (extname.toLowerCase()) {
//        case '.txt' : contentType = 'text/text';            break;
        case '.js'  : contentType = 'text/javascript';      break;
        case '.css' : contentType = 'text/css';             break;
        case '.json': contentType = 'application/json';     break;
        // image
        case '.ico' :
        case '.png' : contentType = 'image/png';            break;
        case '.thm' :                                                // AirComics 썸네일(디렉토리명, 파일명과 같음)
        case '.jpeg':
        case '.jpg' : contentType = 'image/jpg';            break;
        case '.gif' : contentType = 'image/gif';            break;   
        // audio
        case '.wav' : contentType = 'audio/wav';            break;
        case '.mp3' : contentType = 'audio/mp3';            break;
        // video
        case '.mov' : contentType = 'video/quicktime';      break;   // QuickTime
        case '.3gp' : contentType = 'video/3gpp';           break;   // 3GP Mobile
        case '.avi' : contentType = 'video/x-msvideo';      break;   // A/V Interleave
        case '.wmv' : contentType = 'video/x-ms-wmv';       break;   // Windows Media
        case '.flv' : contentType = 'video/x-flv';          break;   // Flash
        case '.mp4' : contentType = 'video/mp4';            break;   // MPEG-4
        case '.m3u8': contentType = 'application/x-mpegURL';break;   // iPhone Index
        case '.ts'  : contentType = 'video/MP2T';           break;   // iPhone Segment
    }
    return contentType;
}
String.prototype.DocumentRoots = function(response){ // DocumentRoots 처리
    if(isDocumentRoots){ // 루트 경로가 여러개인경우
        if(this == '/'){ // / 경로 이면 대상목록 출력
            var list = ''; // 리스트 출력 버퍼
            documentRoots.forEach(function(obj){
                list += '$'+obj.alias+'$\n';
            });
            response.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
            response.end(list, 'utf-8');
            return '';
        }

        // alias 경로가 있는경우
        var target = this.match(/\$(.*)\$/);
        if(!!target){
            // alias를 원 경로로 패치함.
            for(var i=0; i<documentRoots.length; i++){
                if(documentRoots[i].alias==target[1]){
                    documentRoot=documentRoots[i].path;
                    break;
                }
            }
        }else{ // alias 없이 호출된 경우 서버루트 탐색
            documentRoot=serverRoot;
        }

        return this.replace(/\$(.*)\$(\.thm)/,'$1$2') // root 섬네일 처리
                   .replace(/\$.*\$\/|\$.*\$/,'');    // alias 경로 제거, / 가 두번 붙는 경우도 제거
    } // if(isDocumentRoots){ // 루트 경로가 여러개인경우
    return this;
}
function getUserIP(req){ // Client IP추출
    var ipAddress;

    if(!!req.hasOwnProperty('sessionID')){
        ipAddress = req.headers['x-forwarded-for'];
    } else{
        if(!ipAddress){
            var forwardedIpsStr = req.header('x-forwarded-for');

            if(forwardedIpsStr){
                var forwardedIps = forwardedIpsStr.split(',');
                ipAddress = forwardedIps[0];
            }
            if(!ipAddress){
                ipAddress = req.connection.remoteAddress;
            }
        }
    }
    return ipAddress;
}
function getServerIp() { // 서버 IP 가져오기
    var ifaces = os.networkInterfaces();
    var result = [];
    for (var dev in ifaces) {
        var alias = 0;
        ifaces[dev].forEach(function(details) {
            if (details.family == 'IPv4' && details.internal === false) {
                result.push(details.address);
                ++alias;
            }
        });
    }
    return result;
}
function isCompress(filepath){ // 압축파일 처리 
    var rVal = {type:'',inner:false,file:'',img:''
               ,isFalse:function(){return (this.type==''&&this.inner==false)?true:false;}};
    var fn   = filepath.toUpperCase();
    var ln   = fn.length;
    var cln  = fn.indexOf('.ZIP');

    if(cln==-1){ // zip 아님
        cln = fn.indexOf('.RAR');
        if(cln==-1) return false; // rar 아님
        else rVal.type='rar';
    }else rVal.type='zip';
    cln+=4;

    if(filepath.substr(cln,1) == '/'){ // zip 파일 내 이미지의 경우
        rVal.inner = true;
        var filePath = filepath.substr(0      ,cln); // ~.ZIP  까지 자름
        var imgName  = filepath.substr((cln+1)    ); // ~.ZIP/ 이후 자름
        rVal.file=filePath;
        rVal.img =imgName;
    }else if(ln > cln) rVal.type=''; // ~.ZIP/~ 형식이 아닌 경우 컨텐츠로 해석함
    else if(!fs.existsSync(filepath)) rVal.type=''; // 없는 파일이면 패스함.

    if(rVal.isFalse()) return false; // 압축파일, 압축내 파일 아님
    return rVal;
};


// 2021년 2월 28일 일요일
// console.log() 파일쓰기로 변경
var log_file = fs.createWriteStream(__dirname + '/logs/acs.'+new Date().getDTTM2()+'.log', {flags : 'w'});
var log_stdout = process.stdout;
/*
console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};
*/
console.log = function(){
	/*
	for(var i=0; i<arguments.length; i++){
		log_file  .write(util.format(arguments[i]));
		log_stdout.write(util.format(arguments[i]));
	}
	log_file  .write('\n');
	log_stdout.write('\n');
	*/
  log_file  .write(util.format.apply(null,arguments) + '\n');
  log_stdout.write(util.format.apply(null,arguments) + '\n');
}
console.error = console.log;

/******************************************************************************
 * http 서버 설정
 ******************************************************************************/
http.createServer(function (request, response) {
//    console.log('request starting...', new Date().getDTTM(), getUserIP(request));
var ip = request.headers['x-forwarded-for'] || 
     request.connection.remoteAddress || 
     request.socket.remoteAddress ||
     (request.connection.socket ? request.connection.socket.remoteAddress : null);
//var ip;
if (request.headers['x-forwarded-for']) {
    ip = request.headers['x-forwarded-for'].split(",")[0];
} else if (request.connection && request.connection.remoteAddress) {
    ip = request.connection.remoteAddress;
} else {
    ip = request.ip;
}
    console.log('request starting...', new Date().getDTTM(), ip);

    try{
        var filePath = decodeURIComponent(request.url);
        console.log('url:',filePath);

        filePath = filePath.DocumentRoots(response); // 루트 경로가 여러개인경우 처리
        if(filePath=='') return;

        if(filePath.indexOf('완결모음')>0) filePath = filePath.replace(/.thm/,'/[Cover].jpg');
        var dFile = documentRoot + filePath;
		try{
			// 파일크기 표시
			var stats = fs.statSync(dFile);
			var fileSizeInBytes = stats.size;
	        console.log(' path:',dFile,' (',fileSizeInBytes.format(),' Bytes)');
		}catch(e){
			console.log(' path:',dFile);
		}

        var list = ''; // 리스트 출력 버퍼

        // 주소가 디렉토리인지 확인
        if(fs.existsSync(dFile) && fs.lstatSync(dFile).isDirectory()){ // 디렉토리이면 디렉토리 내 리스트 출력
//			console.log('Dir:',dFile);
            fs.readdir(dFile, function(err, filelist){
                try{
                    if (err) throw err;
                    for(var k in filelist) {
//						console.log(filelist[k],'hide:',filelist[k].isHide(),' / pass:',filelist[k].isPass());
                        if(filelist[k].isHide()) continue;
                        if(filelist[k].isPass()) continue;
                        list += filelist[k] + '\n';
                    }
                }catch(e){
                    console.error('321:',e);
                    list = '<pre>'+e.message+'</pre>';
                }
                response.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
                response.end(list, 'utf-8');
            });
        } else { // 디렉토리가 아닌경우
            var obj = isCompress(dFile);
            if(obj){ // 압축파일, 압축파일 내 파일 의 경우
                if(obj.inner){ // 압축파일 내 파일 의 경우
                    console.log('  arc:', obj.file);
                    console.log('  img:', obj.img);
                    var archive = new Compress({file:obj.file,path:serverRoot});
                    var stream = '';
                    if(obj.type == 'zip') stream = archive.stream(obj.img.replace(/\[/g,'[[]')); // name of entry
                    if(obj.type == 'rar') stream = archive.stream(obj.img.replace(/\//g,'\\' )); // name of entry
                    stream.on('error', console.error);

                    response.writeHead(200, { 'Content-Type': obj.img.getContentType() });
                    stream.pipe(response);
                }else{ // 압축파일의 경우
                    console.log('  file:',dFile);
                    new Compress({file:dFile,path:serverRoot}).list(function(err, entries) {
                        try{
                            if (err) throw err;
                            for (var i = 0; i < entries.length; i++) {
                                var fileName = entries[i].name;
                                var type     = entries[i].type;
                                if(type == 'Directory') continue;
                                else if(!require('path').extname(fileName)) continue; // directory

                                // 제외 단어 처리
                                if(fileName.isPass()) continue;

                                list += fileName + '\n';
                            }
                        }catch(e){
                            console.error(e);
                            list = '<pre>'+e.message+'</pre>';
                        }
                        response.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
                        response.end(list, 'utf-8');
                    });
                } // if(obj.inner){ } else // 압축파일의 경우
            }else{ // 압축파일은 아니지만 파일인 경우 (없는경로 포함)
                var contentType=dFile.getContentType();
//                console.log('  file:',dFile);
                fs.readFile(dFile, function(error, content) {
                    if (error) {
                        console.log ('    Error:', error.message);
                        if(error.code == 'ENOENT'){ // 없는 파일/경로인 경우
                            response.writeHead(200, { 'Content-Type': 'text:html' });
                            response.end(error.message, 'utf-8');
                        } else {
                            response.writeHead(500); // ??
                            response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
                            response.end(); 
                        }
                    } else { // 컨텐츠 출력
                        response.writeHead(200, { 'Content-Type': contentType });
                        response.end(content, 'utf-8');
                    }
                });
            } //if(obj){ } else { // 압축파일은 아니지만 파일인 경우
        } // if(isDirExists){ }else {// 디렉토리가 아닌경우
    }catch(err){
        console.log('TRY CATCH ERROR');
        console.error(err);
        response.writeHead(200, { 'Content-Type': contentType });
        response.end(err.stack, 'utf-8');
    }
}).listen(port);

console.log('Server running at ');
var IPs = getServerIp(); // 서버 IP 추출
IPs.unshift('loaclhost','127.0.0.1'); // 배열 앞에 삽입(기본주소)
IPs.forEach(function(ip){
    console.log('  http://'+ip+':'+port+'/');
});
