'use strict';

require('dotenv').config();

const express = require('express');
const app = express();
const AWS = require('aws-sdk');
const urlencode = require('urlencode');
const s3 = new AWS.S3();
const fs = require('fs');
AWS.config.update({ region: process.env.S3_REGION });


app.get('/', function (req, res) {
	console.log("got req for /");
	res.send('Snapa - thumbnail API');
});

app.get('/snap', function (req, res) {
	console.log("got request for /snap");
	const v = req.query.v;
	const signedUrlExpireSeconds = 60 * 20;

	var signedUrl = s3.getSignedUrl('getObject', {
		Bucket: process.env.VIDEO_S3_BUCKET_NAME,
		Key: 'test/' + v,
		Expires: signedUrlExpireSeconds
	});

	signedUrl = urlencode.decode(signedUrl);

	const fname = 'tmpthumb/' + v + '.jpg';

	const
		spawn = require('child_process').spawn,
		f = spawn('ffmpeg', [
			'-i',
			signedUrl,
			'-vf',
			'thumbnail,scale=500:300',
			'-frames:v',
			1,
			fname,
			'-y'
		]);


	f.stdout.on('data', data => {
		console.log(`stdout: ${data}`);
	});

	f.stderr.on('data', data => {
		console.log(`stderr: ${data}`);
	});

	f.on('close', code => {
		console.log(`child process exited with code ${code}`);
		if(code == 0) {
			console.log("Successfully generated thumbnail");
			const fp = "tmpthumb/" + v  + ".jpg";
			const uploadParams = {
				Bucket: process.env.THUMBNAIL_S3_BUCKET_NAME,
				Key: "test/"+ v +".jpg",
				Body: fs.createReadStream(fp),
				ContentType: 'image/jpeg'				
			};

			s3.upload(uploadParams, function(err, data){
				if(err) {
					console.log(err);
					res.send("fail");
				} else {
					res.send(data.Location);
				}
			});
		} else if(code == 1) {
			console.log("ffmpeg issue");
			res.send("fail");
		}
	});

	

});

app.listen(3000, function () {
	console.log('Snapa app listening on port 3000');
});