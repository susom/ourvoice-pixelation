const fs = require('fs')
const gm = require('gm').subClass({imageMagick: true});
const path = require('path');
const vision = require('@google-cloud/vision');
const {Storage} = require('@google-cloud/storage');
const keyFilename = 'som-rit-ourvoice-cloud-storage-key.json';
const {projectId, finalBucketName} = process.env //Alter for local testing

let client, storage;

if (fs.existsSync(keyFilename)) {
    client = new vision.ImageAnnotatorClient({keyFilename});
    storage = new Storage({ projectId, keyFilename });
} else {
    client = new vision.ImageAnnotatorClient();
    storage = new Storage({projectId})
}
  
/**
 * HTTP Cloud Function.
 *
 * @param {Object} req Cloud Function request context.
 *                     More info: https://expressjs.com/en/api.html#req
 * @param {Object} res Cloud Function response context.
 *                     More info: https://expressjs.com/en/api.html#res
 */

exports.pixelateTrigger = async (file, context) => {
    if (file.name.includes('.jpg') || file.name.includes('.jpeg') || file.name.includes('.png')) {
        return await pixelate(file);
    } else {
        return null;
    }
}

const pixelate = async (file) => {
    var imageFile, encoded, tempFilePath;
    if(!file) { // For local testing
        imageFile = fs.readFileSync('./test.jpeg');
        encoded = Buffer.from(imageFile).toString('base64');
        tempFilePath = './test.jpeg';
    } else { // triggered cloud fx
        tempFilePath = `/tmp/${path.parse(file.name).base}`;
        console.log(`attempting to save ${file.name} to ${tempFilePath} `)

        await storage.bucket('transform_ov_walk_files').file(file.name) //Save current file locally to VM temp dir
            .download({ destination: tempFilePath })
            .then(()=> {
                console.log(`Finished download of ${file.name} to temp filepath in local VM :  ${tempFilePath}`);
            })
            .catch((err) => {
                console.log(`Error saving ${file.name} to temp`)
                console.log(err)
                return null;
            })
    }
    
    imageFile = fs.readFileSync(tempFilePath);
    encoded = Buffer.from(imageFile).toString('base64');
    
    const request = {
        image: {content: encoded},
        features: [{type: 'FACE_DETECTION', maxResults: '25'}]
    };
    
    let [response] = await client.annotateImage(request); //Check if there are faces in the image    

    if(response.faceAnnotations.length) {
        console.log(`faces detected in image ${tempFilePath}`);

        let faceCoordinates = response.faceAnnotations.map((e) =>  e.boundingPoly.vertices)
        let img = gm(tempFilePath)
        let bottomLeft, bottomRight, topRight, topLeft; 
        
        await new Promise((resolve, reject) => {
            for(let i in faceCoordinates) {
                bottomLeft = faceCoordinates[i][0] ?? null;
                bottomRight = faceCoordinates[i][1] ?? null;
                topRight = faceCoordinates[i][2] ?? null;
                topLeft = faceCoordinates[i][3] ?? null;
                
                img.region(bottomRight.x-bottomLeft.x, topRight.y-bottomRight.y, bottomLeft.x, bottomLeft.y)
                    .blur(0, 16)
                    
            }

            //rewrite to the same path
            img.write(tempFilePath, function (err, stdout) {
                if (err) {
                    console.error('Failed to blur image.', err);
                    reject(err);
                } else {
                    console.log(`Successfully Blurred image: ${tempFilePath}`);
                    resolve(stdout);
                }
            });
        });
    }
    
    // Upload to production bucket
    const options = {
        destination: file.name
    };

    try {
        await storage.bucket(finalBucketName).upload(tempFilePath, options)
        console.log(`Finished upload of ${tempFilePath} to ${options.destination}`);
    } catch (err) {
        console.log(err)
        throw new Error(`Unable to upload blurred image ${tempFilePath}, ${err}`);
    }

    return fs.unlink(tempFilePath, (err) => {
        if (err) 
            console.log(err);
        else
            console.log(`Deleted ${tempFilePath} successfully, exiting`)
    });
}

