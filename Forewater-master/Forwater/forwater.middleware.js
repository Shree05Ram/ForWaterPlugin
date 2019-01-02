let addForwaterData = (req, res, next) => {
    req.forwaterData = forwaterData;
    next();
}

module.exports = {
    addDikshaData
}