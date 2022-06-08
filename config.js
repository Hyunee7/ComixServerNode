module.exports = {
/*----------------------------------------------------------------------------*/
  // 기본설정
  port         : 31257               ,   // 서버 포트 [기본 : 31257]
//serverRoot   : 'H:/ComixServerNode',   // 서버(acs.js)위치
  serverRoot   : __dirname,              // 서버(acs.js)위치
  documentRoot : 'H:/Comics'         ,   // Comics 기본 경로[단일:문자열]

/*----------------------------------------------------------------------------*/
  // Comics 경로들[복수:개체] 
  // 이미지 경로가 여러곳일때 설정(없으면 documentRoots : [] 로 설정)
  // 서버에서 documentRoot 값으로 path 가 자동 매치됨.
  // documentRoots : [],
  // 구조 [{별칭:대상},{별칭:대상}...]
  // alias : AirComics 앱에 표시될 명칭
  // path : 실제 경로
  documentRoots : [
    {alias:'Comics'    , path:'Z:/완결코믹스'     }, 
    {alias:'사진'      , path:'I:/사진'           },
    {alias:'Camera'    , path:'I:/resize'         },
    {alias:'아이폰백업', path:'H:/임시/iPhone백업'},
    {alias:'SONY-F707' , path:'I:/SONY-F707'      },
  ],

/*----------------------------------------------------------------------------*/
  // 파일 디렉토리 숨길 항목 설정
  passName     : ['THUMBS.DB', '__MACOSX',   // 출력에 제외할 항목(이름에 포함)
                //'.ZIP', '.RAR', '.TXT',
                                  '.TXT',
                  '.MPG', '.ASF', '.ASX', '.MOV', '.WMV',
                  '.EXE', '.HTM', '.CSS',
                  '.PDF', '.INI', '.CAB',
                  '.DAT', '.DAT', '.BIN',
                  '.DLL', '.INX', '.HDR',
                  '.EX_', '.INF', '.DIZ'],
  hideList     : ['Thumbs.db']               // 파일/디렉토리 목록에서 숨길항목(전체 매치)
}

