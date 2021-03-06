let multiparty = require('connect-multiparty');
let multipartMiddle = multiparty();
let fs = require('fs');
let q = require('q');
let {
    createFolderIfNotExists,
    extractFile
} = require('./forwater.controller.js');
let {
    deleteDir
} = require('../../../filesdk');
let {
    exec
} = require('child_process');
let {
    initializeSbDB
} = require('./forwater.db_restart.js');
let {
    addDocument
} = require('../../../searchsdk/index.js');
let {
    startUploadngTelemetry
} = require('./forwater.telemetry_upload.js');


let initializeForwaterData = (path) => {
    let defer = q.defer();
    fs.readFile(path, (err, data) => {
        if (err) {
            return defer.reject(err);
        } else {
            try {
                let config = JSON.parse(data);
                let currentProfile = config.active_profile;
                let currentConfig = config.available_profiles[currentProfile];
                //forwater = currentConfig;
                return defer.resolve(currentConfig);
            } catch (e) {
                console.log(e);
                return defer.reject(false);
            }
        }
    });
    return defer.promise;
}

/*
    Reads ecar files from the location defined in profile.json and extracts them
*/

let processEcarFiles = (filePath) => {
    let defer = q.defer();
    fs.readdir(filePath, (err, files) => {
        if (err) {
            console.log(err);
            return defer.reject(err);
        } else {
            let extractPromises = [];
            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                if (file.slice(file.lastIndexOf(".") + 1) === 'ecar') {
                    extractPromises.push(extractFile(filePath, file));
                }
            }
            q.allSettled(extractPromises).then(values => {
                let statuses = values.map((value, index) => value.state);
                let failIndex = statuses.indexOf("rejected");
                if (failIndex > -1) {
                    return defer.reject(values[failIndex]);
                } else {
                    return defer.resolve(values);
                }
            });
        }
    });
    return defer.promise;
}
/*
    Adds the JSON files to BleveSearch Database
*/

let jsonDocsToDb = (dir) => {
    let defer = q.defer();
    /*
        Updated behavior: Carpet bomb the index and rebuild from scratch
    */
    initializeSbDB().then(value => {
        console.log("Index successfully recreated");
        let promises = [];
        fs.readdir(dir, (err, files) => {
            if (err) {
                return defer.reject(err);
            } else {
                for (let i = 0; i < files.length; i++) {
                    if (files[i].lastIndexOf('.json') + '.json'.length === files[i].length) {
                        promises.push(addDocument({
                            indexName: "dk.db",
                            documentPath: dir + files[i]
                        }))
                    }
                }
                q.allSettled(promises).then(values => {
                    values.forEach(value => {
                        if (typeof value.value.err !== 'undefined') {
                            console.log("Error encountered!")
                            return defer.reject(value.value.err);
                        }
                    });
                    return defer.resolve(values[0].value.success);
                });
            }
        });
    }).catch(e => {
        defer.reject(e);
    });
    return defer.promise;
}

let initialize = () => {

    /*
    initialize telemetry upload
    */
    startUploadngTelemetry();
    /*
        read all ecars and add to search index
    */
    let forwaterData = {};
    initializeForwaterData('/opt/opencdn/appServer/plugins/forwater/profile.json').then(value => {
        forwaterData = value;
        return createFolderIfNotExists(forwaterData.media_root);
    }).then(value => {
        console.log("Created " + forwaterData.media_root);
        return createFolderIfNotExists(forwaterData.telemetry);
    }).then(value => {
        console.log("Created " + forwaterData.telemetry);
        return createFolderIfNotExists(forwaterData.json_dir);
    }).then(value => {
        console.log("Created " + forwaterData.json_dir);
        return createFolderIfNotExists(forwaterData.content_root);
    }).then(value => {
        console.log("Created " + forwaterData.content_root);
        return createFolderIfNotExists(forwaterData.unzip_content);
    }).then(value => {
        console.log("Created " + forwaterData.unzip_content);
        return processEcarFiles(forwaterData.media_root);
    }).then(value => {
        return jsonDocsToDb(forwaterData.json_dir);
    }, reason => {
        console.log(reason);
        console.log("There seem to be corrupt ecar files in the directory.");
        return jsonDocsToDb(forwaterData.json_dir);
    }).then(value => {
        console.log("Initialized API Server");
    }).catch(e => {
        console.log(e);
        if (typeof e.state === 'undefined') {
            console.log(e);
            console.log("Could not initialize API Server");
        }
    });

}
/*
    Initializes plugin metadata
*/
initialize();

/*
    Initializes telemetry upload
*/

module.exports = {
    initializeForwaterData
}
