![Google Cloud](https://img.shields.io/badge/GoogleCloud-%234285F4.svg?style=for-the-badge&logo=google-cloud&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)


# Ourvoice automatic pixelation

- This function will detect faces on uploaded images, obfuscate them, and save the resulting output to a google bucket.

## Deployment
The following command can be run to deploy on cloud functions: 

```
gcloud functions deploy pixelateTrigger --runtime nodejs14 --trigger-resource transform_ov_walk_files --trigger-event google.storage.object.finalize --max-instances 20 --timeout 120s --env-vars-file .env.yaml
```

Note that an `.env.yaml` file will need to be present with the following format:

```
    projectId: <PROJECTID>
    finalBucketName: <BUCKETNAME>
```

Before
![This is an image](/assets/before.jpeg)

After
![This is an image](/assets/after.jpeg)


