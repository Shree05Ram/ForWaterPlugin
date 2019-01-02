let getHomePage = (req, res) => {
    /*
        request body structure :
        {
            id : 'string',
            ets : number,
            request : {
                context : {
                    contentid : 'string',
                    did :  'string',
                    dlang : 'string',
                    uid :  'string',
                },
                filters : {
                    {
                        param : value,
                    }
                }
            }
            ver : "string"

            Use search, extract ID from it and get deets from it
        }
    */
    let parsedReq = req.body;
    log('getHomePage', parsedReq, req.path);
    //console.log(JSON.stringify(parsedReq, null, 4));
    let loadedJson = {};
    let responseStructure = {};
    let query = {};
    let section = [];
    let prebuiltQueryStructures = {};
    let genieResponses = [];
    loadSkeletonJson('forwater_config')
        .then(value => {
            loadedJson = value.data;
            loadedJson.response.sections.forEach(section => {
                prebuiltQueryStructures[section.display.name.en] = section.search;
            });
            let sections = loadedJson.response.sections;
            for (let i in sections) {
                if (sections[i].display.name.en === "Stories") {
                    query = sections[i].search;
                }
            }
            let deviceId = parsedReq.id;
            let ets = parsedReq.ets;
            let request = parsedReq.request;
            let name = request.name;
            let ver = parsedReq.ver;
            let filters = request.filters;
            let queryString = '';
            for (let key in filters) {
                if (typeof filters[key] === 'object') {
                    Object.keys(filters[key]).forEach(innerKey => {
                        queryString += filters[key][innerKey] + ' ';
                    });
                } else {
                    queryString += filters[key] + (' ');
                }
            }
            query.query = queryString;
            return doPrebuiltSearch(prebuiltQueryStructures, queryString);
        }).then(value => {
            let responses = value.responses;
            genieResponses = responses['Best of Genie'];

            //	fs.writeFile("/home/admin/Final_thingy", JSON.stringify(genieResponses, null, 4), (err, res) => {});

            return loadSkeletonJson('homePageResponseSkeleton');
        }).then(value => {
            responseStructure = value.data;
            return doThoroughSearch(query);
        }).then(value => {
            let responses = value.responses;

            //	console.log("_____HERE____");
            //	console.log({query});
            //      console.log({responses});

            return generateResponseStructure(responseStructure, responses);
        }).then(value => {
            responseStructure = value.responseStructure;
            //responseStructure.result.page.sections[i].contents = responses;
            responseStructure.result.response.sections[0].contents = genieResponses;
            responseStructure.ts = new Date();
            responseStructure.ver = parsedReq.ver;
            responseStructure.id = parsedReq.id;
            responseStructure.name = parsedReq.request.name;
            responseStructure.resmsgid = '0211201a-c91e-41d6-ad25-392de813124c';

            //console.log(JSON.stringify(responseStructure, null, 4));
            //fs.writeFile("/home/admin/api.debug", JSON.stringify(responseStructure), (err, res) => console.log('Written debug info to api.debug'));

            //let daata = fs.readFileSync("/home/admin/api_working.debug", 'utf-8');
            //return res.status(200).json(JSON.parse(daata));

            return res.status(200).json(responseStructure);
        }).catch(e => {
            console.log(e);
            return res.status(500).json({
                err: e
            });
        });
}

let getEcarById = (req, res) => {
    log('getEcarById', req.params, req.path);
    let contentID = req.params.contentID;
    let responseStructure = {};
    loadSkeletonJson('searchIdResponseSkeleton')
        .then(value => {
            responseStructure = value.data;
            return doThoroughSearch(contentID);
        }).then(value => {
            responseStructure.result.content = value.responses[0].fields;
            return res.status(200).json(responseStructure);
        }).catch(e => {
            return res.status(500).json({
                e
            });
        });
}

let performSearch = (req, res) => {
    /*
        request body structure :
        {
           "request": {
            "facets": [
              "contentType",
              "domain",
              "ageGroup",
              "language",
              "gradeLevel"
            ],
            "filters": {
              "status": [
                "Live"
              ],
              "compatibilityLevel": {
                "min": 1,
                "max": 3
              },
              "objectType": [
                "Content"
              ],
              "contentType": [
                "Story",
                "Worksheet",
                "Game",
                "Collection",
                "TextBook"
              ]
            },
            "sort_by": {},
            "mode": "soft",
            "query": "",
            "limit": 100
          }
        }


    */
    let request = req.body.request;

    //    log('performSearch', request, req.path);

    let facets = request.facets;
    let responseStructure = {};
    let secondaryQuery = request.filters.identifier || request.filters.contentType;

    let query = request.query || secondaryQuery.join(' ');
    if (query.length < 1) {
        query = request.filters.identifier[0];
    }
    loadSkeletonJson('searchResponseSkeleton').then(value => {
        responseStructure = value.data;
        return doThoroughSearch(query);
    }).then(value => {
        //console.log(value);
        let mappedValues = value.responses.map(val => val.fields);
        return performCounting(mappedValues, facets);
    }).then(value => {
        responseStructure.result.count = value.results.length;
        responseStructure.result.content = value.results;
        responseStructure.result.facets = value.facets;
        //console.log('performSearch resposne \n', JSON.stringify(responseStructure, null, 4));
        //console.log('\n/performSearch response');
        fs.writeFile("/home/admin/api_search.debug", JSON.stringify(responseStructure), (err, res) => console.log({
            err,
            res
        }));
        return res.status(200).json(responseStructure);
    }).catch(e => {
        console.log(e);
        return res.status(500).json({
            e
        });
    });
}

let telemetryData = (req, res) => {
    //console.log(req.files);
    let body = JSON.stringify(req.body);
    log('telemetryData', body, req.path);
    console.log(req.headers);
    //return res.status(200).json({success: true});
    //let fileData = req.files;
    //let oldPath = fileData.file.path;
    let telemetryDir = req.forwaterData.telemetry;
    let now = new Date().getTime();
    baseInt++;
    let responseStructure = {};
    let newFileName = baseInt + '_' + 'tm_' + now + '.json';
    createFolderIfNotExists(telemetryDir)
        .then(value => {
            let newFile = fs.createWriteStream(telemetryDir + newFileName);
            newFile.end();
            return loadSkeletonJson('telemetryResponseSkeleton');
        })
        .then(value => {
            responseStructure = value.data;
            fs.writeFile(telemetryDir + newFileName, body, (err) => {
                responseStructure.ts = new Date();
            return res.status(200).json(responseStructure);
            })
            /*
            zlib.createGzip(new Buffer(body, 'utf-8'), (err, data) => {
                if (err) {
                    console.log("ERR");
                    console.log(err);
                } else {
                    fs.writeFile(telemetryDir + newFileName, data, (err) => {
                        responseStructure.ts = new Date();
                        if (err) {
                            responseStructure.status = "error";
                            responseStructure.errmsg = err;
                            return res.status(500).json(responseStructure);
                        } else {
                            return res.status(200).json(responseStructure);
                        }
                    });
                }
            });*/
        }).catch(e => {
            responseStructure.status = "error";
            responseStructure.errmsg = e;
            return res.status(500).json(responseStructure);
        });
}

module.exports = {
    getHomePage,
    getEcarById,
    performSearch,
    telemetryData
}