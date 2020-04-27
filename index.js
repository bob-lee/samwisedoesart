/* image file naming / uploading convention

  1. crop image first if required, then optimize
  2. give it an unique name like 'Sarah.jpg'
  3. create a folder like '2019' in storage
  4. upload image, function 'recordUrl' to record its url in database
  5. the web app to look for image's record under '2019' in database expecting:

     {
         fileName,
         url,
     }

  Note 1. image to upload to be smaller than 500KB
  Note 2. recommend to use GIMP to crop and scale, then use tinyjpg.com to compress to get a file to upload
  Note 3. if circular image required, copy selection of image and paste to a new image with transparent background, then exports as png
  Note 4. if required, add 'text' field to the record with a string to be shown under the image
  Note 5. last added image will be shown first at top, so if order needs to change, multiple delete / add may need
*/

const functions = require('firebase-functions')

// The Firebase Admin SDK to access the Firebase Realtime Database
const admin = require('firebase-admin')
const serviceAccount = require("./samwisedoesart-firebase-adminsdk-qlq7b-6014de6bb4.json")
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://samwisedoesart.firebaseio.com"
})

const mkdirp = require('mkdirp-promise')
const cors = require('cors')({ origin: true })
const spawn = require('child-process-promise').spawn
const path = require('path')
const os = require('os')
const fs = require('fs')

exports.deleteUrl = functions.storage.object().onDelete(async (object) => {
  const filePath = object.name // 'illustration/Sarah.jpg'
  const fileDir = path.dirname(filePath) // 'illustration'
  const fileName = path.basename(filePath) // e.g. 'Sarah.jpg' or 'of_Sarah.jpg.jpg'

  const folder = admin.database().ref(fileDir)
  const snap = await folder
    .orderByChild('fileName')
    .equalTo(fileName)
    .once('value')

  snap.forEach(async i => {
    const item = folder.child(`${i.key}`)
    try {
      await item.remove()
      console.log(`found a record(${i.key}) and removed ok`)
    } catch (err) {
      console.error(`found a record(${i.key}) but failed to remove: ${err.message}`)
    }
  })
  return console.log('deleteUrl:', fileDir, fileName)
})

exports.recordUrl = functions.storage.object().onFinalize(async (object) => {
  const metageneration = object.metageneration // string type
  // File and directory paths
  const filePath = object.name // 'illustration/Sarah.jpg'
  const fileDir = path.dirname(filePath) // 'illustration'
  const fileName = path.basename(filePath) // 'Sarah.jpg'
  const fileExt = fileName.split('.').splice(-1).join().toLowerCase()

  // Exit if this is triggered on a file that is not an image
  if (!object.contentType.startsWith('image/')) {
    return console.log('This is not an image, ', object.contentType)
  }

  // Exit if this is a move or deletion event
  // eslint-disable-next-line
  if (metageneration != 1) {
    return console.log('This is not a creation event. metageneration = ', metageneration)
  }

  // Cloud Storage files
  const bucket = admin.storage().bucket(object.bucket)
  const file = bucket.file(filePath)

  // Get the Signed URLs for the thumbnail and original image.
  const config = {
    action: 'read',
    expires: '03-01-2500'
  }

  const result = await file.getSignedUrl(config)
  const url = result[0]
  await admin.database().ref(fileDir)
    .push({
      fileName,
      url,
      text: '',
      order: '-'
    })
  
  return console.log(`recorded url of '${fileName}' ok`)

})

exports.getUrlsOrdered = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const params = req.url.split('/')
    const group = params[1]
    const snapshot = await admin.database().ref(group).orderByChild('order').once('value')
    const list = []
    snapshot.forEach(item => {
      list.push(item.val())
    })
    res.status(200).json(list)
  })
})
