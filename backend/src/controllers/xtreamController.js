const xtreamApiService = require('../services/xtreamApiService');
const { validationResult } = require('express-validator');

exports.connect = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { server, username, password } = req.body;
        const accountInfo = await xtreamApiService.authenticate(server, username, password);
        res.json(accountInfo);
    } catch (error) {
        next(error);
    }
};

exports.import = async (req, res, next) => {
    try {
        const { server, username, password } = req.body;
        if (!server || !username || !password) {
            return res.status(400).json({ message: 'Credenciais incompletas.' });
        }
        const playlistData = await xtreamApiService.importAsPlaylist(server, username, password);
        res.json(playlistData);
    } catch (error) {
        next(error);
    }
};

exports.getLiveCategories = async (req, res, next) => {
    try {
        const { server, username, password } = req.query;
        const categories = await xtreamApiService.getLiveCategories(server, username, password);
        res.json(categories);
    } catch (error) {
        next(error);
    }
};

exports.getLiveStreams = async (req, res, next) => {
    try {
        const { server, username, password, category_id } = req.query;
        const streams = await xtreamApiService.getLiveStreams(server, username, password, category_id);
        res.json(streams);
    } catch (error) {
        next(error);
    }
};

exports.getVodCategories = async (req, res, next) => {
    try {
        const { server, username, password } = req.query;
        const categories = await xtreamApiService.getVodCategories(server, username, password);
        res.json(categories);
    } catch (error) {
        next(error);
    }
};

exports.getVodStreams = async (req, res, next) => {
    try {
        const { server, username, password, category_id } = req.query;
        const streams = await xtreamApiService.getVodStreams(server, username, password, category_id);
        res.json(streams);
    } catch (error) {
        next(error);
    }
};

exports.getSeriesCategories = async (req, res, next) => {
    try {
        const { server, username, password } = req.query;
        const categories = await xtreamApiService.getSeriesCategories(server, username, password);
        res.json(categories);
    } catch (error) {
        next(error);
    }
};

exports.getSeries = async (req, res, next) => {
    try {
        const { server, username, password, category_id } = req.query;
        const series = await xtreamApiService.getSeries(server, username, password, category_id);
        res.json(series);
    } catch (error) {
        next(error);
    }
};

exports.getSeriesInfo = async (req, res, next) => {
    try {
        const { server, username, password, series_id } = req.query;
        const info = await xtreamApiService.getSeriesInfo(server, username, password, series_id);
        res.json(info);
    } catch (error) {
        next(error);
    }
};

exports.getVodInfo = async (req, res, next) => {
    try {
        const { server, username, password, vod_id } = req.query;
        const info = await xtreamApiService.getVodInfo(server, username, password, vod_id);
        res.json(info);
    } catch (error) {
        next(error);
    }
};

exports.getShortEPG = async (req, res, next) => {
    try {
        const { server, username, password, stream_id } = req.query;
        const epg = await xtreamApiService.getShortEPG(server, username, password, stream_id);
        res.json(epg);
    } catch (error) {
        next(error);
    }
};