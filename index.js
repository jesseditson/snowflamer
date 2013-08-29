var http = require('http')
var request = require('request')
var fs = require('fs')
var url = require('url')
var path = require('path')
var im = require('imagemagick')
var exec = require('child_process').exec

process.on('uncaughtException',function(err){
  console.log('error thrown: ', err)
})

var tmpdir = './tmp'
var snowflame = './assets/snowflame.png'
var snowWidth = 320
var snowHeight = 452
try { fs.mkdirSync(tmpdir,0755) } catch(e){}

var server = http.createServer(function(req,res){
  var params = url.parse(req.url).pathname.split('/')
  var fileUrl = decodeURIComponent(params[1])
  var returnError = function(e){
    console.error(e.stack)
    res.writeHead(500)
    res.end('failed writing file: ' + e.message)
  }
  if(!fileUrl){
    res.writeHead(404)
    return res.end('please pass a valid (urlencoded) url to a file')
  }
  var filename = fileUrl.split('/').slice(-1)[0]
  var completeFile = path.join(tmpdir,params[1] + '.png')
  if(fs.existsSync(completeFile)){
    //return fs.createReadStream(completeFile).pipe(res)
  }
  var outfile = path.join(tmpdir,filename.replace(/(\.[^\.]+)$/, new Date().getTime() + "$1"))
  console.log('downloading',fileUrl,'to',outfile)
  var r = request(fileUrl).pipe(fs.createWriteStream(outfile))
  r.on('error',function(e){
    console.error('error downloading file')
    returnError(e)
  })
  r.on('finish',function(){
    res.writeHead(200, {'Content-Type': 'image/png'})
    im.identify(['-format', '%hx%w', outfile],function(err,dim){
      if(err) return returnError(err)
      var dims = dim.split('x')
      var height = parseInt(dims[0].trim(),10)
      var width = parseInt(dims[1].trim(),10)
      var toHeight = height * 0.9
      var toWidth = snowWidth * (toHeight / snowHeight)
      var top = height - toHeight
      var left = width * 0.1
      var options = [
        outfile,
        '-draw "image over '+left+','+top+' '+toWidth+','+toHeight+'\''+snowflame+'\'"',
        completeFile
      ]
      console.log('convert',options.join(' '))
      exec('convert ' + options.join(' '),function(err,stdout,stderr){
        if(err || stderr) return returnError(err || new Error(stderr))
        console.log('converted.')
        fs.createReadStream(completeFile).pipe(res)
        // clean up
        //fs.unlink(outfile)
      })
    })
  })
})

server.listen(process.env['PORT'] || 8997)