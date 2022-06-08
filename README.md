# ComixServerNode
============

ComixServerNode 는 Windows 에서 구동하는 Node.JS 로 제작된 AirComix Server 입니다.\
(**iOS**, **Android AirComix** app 으로 테스트 되었습니다.)

## 기능
- AirComix app 에 대응하는 서버 프로그램
- 이미지파일(JPG,GIF등) 외 압축파일 지원(ZIP,RAR)
- 여러드라이브와 다양한 경로를 한번에 설정가능
- 로그 저장
- 기능파일과 설정파일 분리


## 설치

- 예시\
  서버포트    : 31257\
  서버위치    : c:\AirComicsServer\
  Comics 위치 : d:\Comics
- https://nodejs.org/ko/ 에서 Node.JS를 다운받아 설치 함
- 서버 디렉토리 생성 (ex: c:\AirComicsServer)
- 압축 해제한 파일들을 서버디렉토리로 옮김 (ex: c:\AirComicsServer)
- config.js 수정\
  port         : 사용할 포트 (ex: port=31257)\
  documentRoot : Comics 위치 (ex: documentRoot='d:/Comics')\
  serverRoot   : 서버위치    (ex: serverRoot='c:/AirComicsServer')
- 도스창에서 실행 (ex: node c:\AirComicsServer\acs)

## 라이센스

ComixServerNode는 [GNU GPLv3](http://www.gnu.org/licenses/gpl.txt)에 따라 라이센스가 부여된 무료 소프트웨어입니다.\
누구나 복사, 수정 및 재배포할 수 있습니다.