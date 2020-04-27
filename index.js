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

import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import App from './src/App'
// import getUrls from './src/Work/api'
import express from 'express'
// import * as fs from 'fs'
// import * as functions from 'firebase-functions'

const index = fs.readFileSync(__dirname + '/index.html', 'utf8')

const app = express()

app.get('**', (req, res) => {
  const frags = req.url.split('/')
  const workPath = frags.length === 3 && frags[1] === 'work' ? frags[2] : ''
  console.log(`url: '${req.url}', ${frags.length}, '${workPath}'`)

  if (workPath) {
    renderApplication(req, res, index, work[workPath])
    // getUrls(workPath, true).then(urls => { // will fail on Spark plan
    //   renderApplication(req, res, index, urls)
    // })
  } else {
    renderApplication(req, res, index)
  }
})

function renderApplication(req, res, index, serverData) {
  const context = {}
  const appHtml = renderToString(
    <StaticRouter
      location={req.url}
      context={context}
    >
      <App />
    </StaticRouter>
  )
  const tempHtml = index.replace('/** ::APP:: **/', appHtml)
  const finalHtml = tempHtml.replace('/** ::SERVER_DATA:: **/', JSON.stringify(serverData || ''))
  res.set('Cache-Control', 'public, max-age=600 s-maxage=1200')
  res.send(finalHtml)
}

export let ssr = functions.https.onRequest(app);

/* Free Spark plan on Firebase limits external call 
like https://us-central1-joanne-lee.cloudfunctions.net/getUrlsOrdered/illustration
and functions log says "Billing account not configured. External network is not 
accessible and quotas are severely limited."
Refer to question and comments by Doug Stevenson at:
https://stackoverflow.com/questions/42784000/calling-a-cloud-function-from-another-cloud-function

Normally an api call is made from client browser and wouldn't suffer this limitation
but if user is seeing one of the work page and clicked Refresh button, it will hit here
and a call from here will be considered as external. 

So to avoid the error in this situation, serve urls from a static json object 'work' below.
*/

// temporary static json object that holds current set of urls on database 
const work = {
  "portrait": [
  ],
  "painting": [
    {
      "fileName": "20190327_182701.jpg",
      "order": "p34",
      "text": "45 x 90 cm, acrylic on canvas",
      "url": "https://storage.googleapis.com/joanne-lee.appspot.com/painting%2F20190327_182701.jpg?GoogleAccessId=firebase-adminsdk-djr6r@joanne-lee.iam.gserviceaccount.com&Expires=16730323200&Signature=AleJhNn8hbG4SEpcn%2BhUUBYKR0bOTdn%2BgZxFUGYfjmEpyOEIpim3Om86Xu5KqNxQbKXx2WbL4JhfRzB7AWbCnqOkn5Zdm%2Fa01sCEqn9rUda5RDh%2BIetAgLThkywU0nsTGQBj0SVymY32HjeD88pR9v4eIlxcWqwuomBmIetLvY9jgdVui%2FoN8gQ1Esce5v%2BduT3uDekrWPBBEjoSn%2BBdHfPJIiS5GGSQkrg74otXbI8ArbmAviFPF2ncoZnz7LOx2hwjU4MIztXxZW%2BF6PFiGoXyACiaMXavvUUS2%2BisvvgAeaEC4Che0%2FpAsxPmHGNApLNJgrMCL6JAUzbYnOA6Vg%3D%3D"
    }
  ],
  "illustration": [
    {
      "fileName": "ScanNewYearsCard2t_800t.jpg",
      "order": "i09",
      "text": "New year card",
      "url": "https://storage.googleapis.com/joanne-lee.appspot.com/illustration%2FScanNewYearsCard2t_800t.jpg?GoogleAccessId=firebase-adminsdk-djr6r@joanne-lee.iam.gserviceaccount.com&Expires=16730323200&Signature=J6XhKXTBdVy1p5bT1m88uOxqTCD68yWSpNE6iOpoCB7Gkuqx5YPFp4gSan%2FivKX3sH0d6kuJ1geqkoT7i0PdzNkgyN3HyfKGPM9KAJUrHxudCKbIUCCA8efWcHvlGNhTtXpK2RpoQx8h2X7OEQ3gxJ5Mo5DXyUJAJOfR70tpI9lT6RLCw%2B6avMr%2BRSVXW0AYbGhifdUVEs0zkCaVlzqzbPZ8NlJY0UI%2F%2B%2FLXuHa4C75hAmFP%2BTosD7w6HTfJYMp2uEYyKcBgwt1Zu7jfdpJrpeoa67nrdLdOoUcQYfzEK7JrSF79kCJkpZlRo%2Bz37zX6Jw9QGfIG04L5Dqr06fGD3w%3D%3D"
    }
  ]
}
