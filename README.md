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


