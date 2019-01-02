let {
    addForwaterData
} = require('./forwater.middleware.js')
let {
    getHomePage,
    getEcarById,
    performSearch,
    telemetryData,
    extractFile,
    performRecommendation,
    createFolderIfNotExists
} = require('./forwater.controller.js');
// let { uploadTelemetryToCloud } = require('./forwater.telemetry_upload.js');

module.exports = app => {
    /*
        forwater API endpoints
    */
    app.post('/api/data/v1/page/assemble', getHomePage); // Needs fixing
    app.get('/api/content/v1/read/:contentID', getEcarById);
    app.post('/api/data/v1/telemetry', addForwaterData, telemetryData);
    app.post('/api/composite/v1/search', performSearch);
}
