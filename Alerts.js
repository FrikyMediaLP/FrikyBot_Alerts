const express = require('express');
const fs = require('fs');
const path = require('path');
const TWITCHIRC = require('./../../Modules/TwitchIRC.js');

const FrikyDB = require('./../../Util/FrikyDB.js');

const PACKAGE_DETAILS = {
    name: "Alerts",
    description: "Sound and Visual Alerts of Subscriptions, Cheers and other Chat Events.",
    picture: "/images/icons/bell-solid.svg",
    api_requierements: {
        eventsubs: ['stream.online', 'channel.follow', 'channel.subscribe', 'channel.subscription.gift', 'channel.subscription.message', 'channel.cheer', 'channel.raid', 'channel.channel_points_custom_reward_redemption.add', 'channel.channel_points_custom_reward_redemption.update', 'channel.poll.begin', 'channel.poll.update', 'channel.poll.end', 'channel.prediction.begin', 'channel.prediction.update', 'channel.prediction.lock', 'channel.prediction.end', 'channel.hype_train.begin', 'channel.hype_train.update', 'channel.hype_train.end', 'channel.goals.begin', 'channel.goals.update', 'channel.goals.end'],
        endpoints: ['GetUsers', 'GetGlobalEmotes', 'GetChannelEmotes']
    },
    version: '0.4.0.0',
    server: '0.4.0.0',
    modules: {
        twitchapi: '0.4.0.0',
        twitchirc: '0.4.0.0',
        webapp: '0.4.0.0'
    },
    packages: []
};

const SUPPORTED_ALERTS = ['join', 'follow', 'sub', 'resub', 'giftsub', 'giftbomb', 'upgrade', 'cheer', 'host', 'raid'];
const SUPPORTED_EVENTS = ['poll', 'prediction', 'channel_point_redemption', 'hypetrain'];

const ALERT_VARIABLES = {
    'join': [
        { name: 'username', desc: 'The name of the user joining the IRC.', type: 'string' }
    ],
    'follow': [
        { name: 'username', desc: 'The name of the user following the Channel.', type: 'string' }
    ],
    'sub': [
        { name: 'username', desc: 'The name of the user subscribing to the channel.', type: 'string' },
        { name: 'tier', desc: "Returns 'Tier 1', 'Tier 2', 'Tier 3' or 'Twitch Prime'.", type: 'string' }
    ],
    'resub': [
        { name: 'username', desc: 'The name of the user resubscribing to the channel.', type: 'string' },
        { name: 'tier', desc: "Returns 'Tier 1', 'Tier 2', 'Tier 3' or 'Twitch Prime'.", type: 'string' },
        { name: 'months', desc: 'The amount of months a user has been subscribed for.', type: 'number' },
        { name: 'message', desc: 'Message sent by the user.', type: 'string' }
    ],
    'giftsub': [
        { name: 'username', desc: 'The name of the user gifting subs.', type: 'string' },
        { name: 'tier', desc: "Returns 'Tier 1', 'Tier 2', 'Tier 3' or 'Twitch Prime'.", type: 'string' },
        { name: 'target', desc: 'The name of the user receiving a sub.', type: 'string' },
        { name: 'total', desc: 'The total number of subgifts the user has.', type: 'number' }
    ],
    'giftbomb': [
        { name: 'username', desc: 'The name of the user gifting subs.', type: 'string' },
        { name: 'tier', desc: "Returns 'Tier 1', 'Tier 2', 'Tier 3' or 'Twitch Prime'.", type: 'string' },
        { name: 'amount', desc: 'The amount of subs gifted.', type: 'number' },
        { name: 'total', desc: 'The total number of subgifts the user has.', type: 'number' }
    ],
    'upgrade': [
        { name: 'username', desc: 'The name of the user gifting subs.', type: 'string' },
        { name: 'tier', desc: "Returns 'Tier 1', 'Tier 2' or 'Tier 3'.", type: 'string' }
    ],
    'giftupgrade': [
        { name: 'username', desc: 'The name of the user gifting subs.', type: 'string' },
        { name: 'target', desc: 'The name of the user receiving a subupgrade.', type: 'string' },
        { name: 'tier', desc: "Returns 'Tier 1', 'Tier 2' or 'Tier 3'.", type: 'string' }
    ],
    'cheer': [
        { name: 'username', desc: 'The name of the user donating bits.', type: 'string' },
        { name: 'amount', desc: 'The amount of bits donated.', type: 'number' }
    ],
    'host': [
        { name: 'username', desc: 'The name of the user hosting.', type: 'string' },
        { name: 'amount', desc: 'The amount of viewers who joined the host.', type: 'number' }
    ],
    'raid': [
        { name: 'username', desc: 'The name of the user raiding.', type: 'string' },
        { name: 'amount', desc: 'The amount of viewers  who joined the raid.', type: 'number' }
    ]
};

const DEFAULT_ALERT_TEXTS = {
    'join': '{username} just joined the stream!',
    'follow': '{username} just followed! Say hi everyone HeyGuys',
    'sub': '{username} just subscribed!',
    'resub': '{username} just resubscribed for {months} Months!',
    'giftsub': '{username} just gifted a {tier} Sub to {target}',
    'giftbomb': '{username} just gifted {amount} {tier} Subs',
    'upgrade': '{username} just upgraded their subscription to {tier}!',
    'cheer': '{username} just donated {amount} Bits.',
    'host': '{username} just hosted with {amount} Viewers.',
    'raid': '{username} just raided with {amount} Viewers.'
};
const DEFAULT_ALERT_SETTINGS = [
    { name: 'move_in', type: 'string', default: 'Fade' },
    { name: 'move_out', type: 'string', default: 'Fade' },
    { name: 'layout', type: 'number', default: 6 },
    { name: 'layout', type: 'number', default: 6 },
    { name: 'text_font', type: 'string', default: 'Arial' },
    { name: 'text_size', type: 'number', default: 50, min: 1, max: 100 },
    { name: 'text_bold', type: 'boolean', default: true },
    { name: 'text_color', type: 'string', default: '#000000' },
    { name: 'text_tts', type: 'boolean', default: false },
    { name: 'text_shadow', type: 'boolean', default: false },
    { name: 'text_shadow_color', type: 'string', default: '#000000' },
    { name: 'text_tts', type: 'boolean', default: false },
    { name: 'vari_font', type: 'string', default: 'Arial' },
    { name: 'vari_bold', type: 'boolean', default: true },
    { name: 'vari_color', type: 'string', default: '#000000' },
    { name: 'vari_shadow', type: 'boolean', default: false },
    { name: 'vari_shadow_color', type: 'string', default: '#000000' },
    { name: 'message_layout', type: 'number', default: 1, min: 1, max: 2 },
    { name: 'message_font', type: 'string', default: 'Arial' },
    { name: 'message_size', type: 'number', default: 30, min: 1, max: 100 },
    { name: 'message_bold', type: 'boolean', default: true },
    { name: 'message_color', type: 'string', default: '#000000' },
    { name: 'message_shadow', type: 'boolean', default: false },
    { name: 'message_shadow_color', type: 'string', default: '#000000' },
    { name: 'message_show_emotes', type: 'boolean', default: true },
    { name: 'message_tts', type: 'boolean', default: false },
    { name: 'message_tts_skip_emotes', type: 'boolean', default: false },
    { name: 'image', type: 'string', default: '' },
    { name: 'video_volume', type: 'number', default: 50, min: 0, max: 100 },
    { name: 'sound', type: 'string', default: '' },
    { name: 'sound_volume', type: 'number', default: 50, min: 0, max: 100 },
    { name: 'delay', type: 'number', default: 5, min: 0 },
    { name: 'on_time', type: 'number', default: 5, min: 0 },
    { name: 'css', type: 'string', default: '' },
    { name: 'js', type: 'string', default: '' }
];

const SUPPORTED_IMG_FILES = ['png', 'jpg', 'jpeg', 'gif', 'mp4'];
const SUPPORTED_VIDEO_FILES = ['mp4', 'webm'];
const SUPPORTED_SOUND_FILES = ['ogg', 'mp3', 'wav'];
const SUPPORTED_FILES = SUPPORTED_IMG_FILES.concat(SUPPORTED_VIDEO_FILES).concat(SUPPORTED_SOUND_FILES);

class Alerts extends require('./../../Util/PackageBase.js').PackageBase {
    constructor(webappinteractor, twitchirc, twitchapi, logger) {
        super(PACKAGE_DETAILS, webappinteractor, twitchirc, twitchapi, logger);
        
        this.Config.AddSettingTemplates([
            { name: 'Custom_File_Dir', type: 'string', default: this.getMainPackageRoot() + this.getName() + "/custom_files/" },
            { name: 'Data_Dir', type: 'string', default: this.getMainPackageRoot() + this.getName() + "/data/" },
            { name: 'tts_voice', type: 'string', default: '' },
            { name: 'tts_pitch', type: 'number', default: 0, min: -1, max: 2 },
            { name: 'tts_volume', type: 'number', default: 50, min: 0, max: 100 }
        ]);
        this.Config.Load();
        this.Config.FillConfig();

        this.RESTRICTED_HTML_HOSTING = 'moderator';

        //Controllables
        this.addControllables([
            { name: 'terminate_tcp', title: 'Terminate TCP Clients', callback: async (user) => this.TerminateTCPClients("manuell") }
        ]);
    }

    async Init(startparameters) {
        if (!this.isEnabled()) return Promise.resolve();
        let cfg = this.GetConfig();

        //Setup File Structure
        const files = [cfg['Data_Dir'], cfg['Custom_File_Dir']];
        for (let file of files){
            try {
                if (!fs.existsSync(path.resolve(file))) {
                    fs.mkdirSync(path.resolve(file));
                }
            } catch (err) {
                this.Logger.error(err.message);
            }
        }
        
        this.Config.Load();
        this.Config.FillConfig();
        
        //Twitch Chat and EventSub Callbacks
        this.setEventCallbacks();

        //Databases
        this.HISTORY_DATABASE = new FrikyDB.Collection({ path: path.resolve(cfg['Data_Dir'] + 'history.db') });
        this.EVENTS_DATABASE = new FrikyDB.Collection({ path: path.resolve(cfg['Data_Dir'] + 'events.db') });
        this.OVERLAY_DATABASE = new FrikyDB.Collection({ path: path.resolve(cfg['Data_Dir'] + 'overlays.db') });
        this.PROFILE_DATABASE = new FrikyDB.Collection({ path: path.resolve(cfg['Data_Dir'] + 'profiles.db') });
        this.CHATOUTPUT_DATABASE = new FrikyDB.Collection({ path: path.resolve(cfg['Data_Dir'] + 'chatoutput.db') });

        //Caches
        this.CHATOUTPT_CACHE = new FrikyDB.Collection_Cache({}, this.CHATOUTPUT_DATABASE);

        //Alert Temp
        this.SUBBOMBS_TEMP = [];
        this.HYPETRAIN_TEMP = null;
        this.COUNTER_PER_STREAM = {
            sub: 0,
            cheer: 0,
            giftsub: 0,
            follow: 0
        };

        //API
        let APIRouter = express.Router();
        APIRouter.get('/settings', async (req, res, next) => {
            this.Config.FillConfig();

            let promises = [
                this.TwitchAPI.GetCustomReward({ broadcaster_id: this.TwitchIRC.getRoomID() }),
                this.AccessFrikyDB(this.OVERLAY_DATABASE, {}),
                this.AccessFrikyDB(this.PROFILE_DATABASE, {}),
                this.CHATOUTPT_CACHE.GetCache()
            ];

            //Await Data
            let cpr_rewards = [];
            let data = [];
            try {
                data = await Promise.all(promises);
                for (let reward of data[0].data) cpr_rewards.push({ id: reward.id, title: reward.title });
            } catch (err) {

            }

            //missing Eventsubs
            let missing_global_eventsubs = this.TwitchAPI.GetMissingEventSubs();
            let missing_eventsubs = missing_global_eventsubs.filter(elt => PACKAGE_DETAILS.api_requierements.eventsubs.find(elt2 => elt === elt2) !== undefined);

            //missing API Endpoints
            let missing_global_endpoints = this.TwitchAPI.GetMissingEndpoints();
            let missing_endpoints = missing_global_endpoints.filter(elt => PACKAGE_DETAILS.api_requierements.endpoints.find(elt2 => elt === elt2) !== undefined);

            //Return Data
            try {
                res.json({
                    cfg: this.GetConfig(),
                    files: this.GetCustomFiles(),
                    hostname: this.WebAppInteractor.GetHostnameAndPort(),
                    upload_limit: this.WebAppInteractor.GetUploadLimit(),
                    DEFAULT_ALERT_SETTINGS,
                    DEFAULT_ALERT_TEXTS,
                    alerts: SUPPORTED_ALERTS,
                    events: SUPPORTED_EVENTS,
                    overlays: data[1],
                    profiles: data[2],
                    chat_output: data[3],
                    cpr_rewards,
                    missing_eventsubs,
                    missing_endpoints
                });
            } catch (err) {
                return res.sendStatus(500);
            }
        });
        APIRouter.put('/settings/tts', (req, res, next) => {
            let pitch = req.body['pitch'];
            let voice = req.body['voice'];
            let volume = req.body['volume'];

            let errs = {};

            let s = this.Config.UpdateSetting('tts_pitch', pitch);
            if (s !== true) errs['pitch'] = s;
            
            s = this.Config.UpdateSetting('tts_voice', voice);
            if (s !== true) errs['voice'] = s;
            
            s = this.Config.UpdateSetting('tts_volume', volume);
            if (s !== true) errs['volume'] = s;

            return res.json({ cfg: this.GetConfig(), errs: errs });
        });
        
        APIRouter.route('/overlays')
            .get(async (req, res, next) => {
                let overlays = [];

                try {
                    overlays = await this.OVERLAY_DATABASE.find({});
                } catch (err) {
                    console.log(err);
                }

                return res.json({ overlays });
            })
            .post(async (req, res, next) => {
                let token = req.body['token'];
                let name = req.body['name'];
                let description = req.body['description'];
                let type = req.body['type'];
                let chroma_key = req.body['chroma_key'];
                let settings = req.body['settings'];

                if (!name || !token) return res.json({ err: 'Token Info incomplete!' });

                //Save to DB
                try {
                    await this.OVERLAY_DATABASE.insert({ token, name, description, type, chroma_key, settings }, { token });
                } catch (err) {
                    return res.json({ err: err.message });
                }
                
                return res.sendStatus(200);
            })
            .put(async (req, res, next) => {
                let token = req.body['token'];
                let name = req.body['name'];
                let description = req.body['description'];
                let type = req.body['type'];
                let chroma_key = req.body['chroma_key'];
                let settings = req.body['settings'];

                if (!name || !token) return res.json({ err: 'Token Info incomplete!' });

                //Save to DB
                try {
                    await this.OVERLAY_DATABASE.update({ token }, { token, name, description, type, chroma_key, settings });
                } catch (err) {
                    return res.json({ err: err.message });
                }

                //Send to TCP Overlays
                this.TCPMassSend('Overlay', 'overlay', { token, name, description, type, settings }, (client) => {
                    if (!client.misc) return false;
                    return client.misc.split(',')[0].split(':').pop() === token;
                });

                //TCP Overlay Change Misc
                for (let client of this.TCP_Clients) {
                    for (let misc of client.misc.split(',')) {
                        let misc_type = misc.split(':')[0];
                        let misc_info = misc.split(':')[1];

                        if (misc_type === 'token') {
                            if (misc_info === token) {
                                client.misc = 'token:' + token + ',' + Object.getOwnPropertyNames(settings);
                            }
                        }
                    }
                }
                return res.sendStatus(200);
            })
            .move(async (req, res, next) => {
                let token = req.body['token'];
                let old_token = req.body['old_token'];
                let name = req.body['name'];
                let description = req.body['description'];
                let type = req.body['type'];
                let chroma_key = req.body['chroma_key'];
                let settings = req.body['settings'];

                if (!name || !token || !old_token) return res.json({ err: 'Token Info incomplete!' });

                //Save to DB
                try {
                    await this.OVERLAY_DATABASE.update({ token: old_token }, { token, name, description, type, chroma_key, settings });
                } catch (err) {
                    return res.json({ err: err.message });
                }

                //DONT TELL WEBSOCKET - would tell a leaked URL what the new token is

                return res.sendStatus(200);
            })
            .delete(async (req, res, next) => {
                let token = req.body['token'];
                let multi = req.body['multi'];
                
                try {
                    await this.OVERLAY_DATABASE.remove({ token }, { multi: multi === true });
                } catch (err) {
                    return res.json({ err: err.message });
                }

                //Send to TCP Overlays
                this.TCPMassSend('Overlay', 'overlay', 'invalid', (client) => {
                    if (!client.misc) return false;
                    return client.misc.split(',')[0].split(':').pop() === token;
                });

                //TCP Overlay Change Misc
                for (let client of this.TCP_Clients) {
                    for (let misc of client.misc.split(',')) {
                        let misc_type = misc.split(':')[0];
                        let misc_info = misc.split(':')[1];

                        if (misc_type === 'token') {
                            if (misc_info === token) {
                                client.misc = 'token:' + token;
                            }
                        }
                    }
                }

                return res.sendStatus(200);
            });

        APIRouter.route('/profiles')
            .get(async (req, res, next) => {
                try {
                    let data = await this.AccessFrikyDB(this.PROFILE_DATABASE, {});
                    res.json({ data });
                } catch (err) {
                    res.json({ err: 'Internal Error.' });
                }
            })
            .post(async (req, res, next) => {
                let name = req.body['name'];
                let profile_cfg = req.body['cfg'];
                profile_cfg['name'] = name;

                try {
                    await this.PROFILE_DATABASE.insert(profile_cfg);
                } catch (err) {
                    console.log(err);
                    return res.sendStatus(500);
                }

                this.TCPMassSend('Overlay', '+profiles', profile_cfg, (client) => true);
                return res.json(profile_cfg);
            })
            .put(async (req, res, next) => {
                let name = req.body['name'];
                let rename = req.body['rename'];
                if (name === 'default') return res.json({ err: 'default cant changed' });
                let profile_cfg = req.body['cfg'];
                
                if (rename !== undefined) {
                    //RENAME
                    profile_cfg['name'] = rename;
                    this.TCPMassSend('Overlay', '-profiles', name, (client) => true);
                } else {
                    //UPDATE
                    profile_cfg['name'] = name;
                }

                try {
                    await this.PROFILE_DATABASE.update({ name }, profile_cfg);
                } catch (err) {
                    console.log(err);
                    return res.sendStatus(500);
                }
                
                this.TCPMassSend('Overlay', '~profiles', profile_cfg, (client) => true);
                return res.json(profile_cfg);
            })
            .delete(async (req, res, next) => {
                let name = req.body['name'];
                if (name === 'default') return res.json({ err: 'default cant deleted' });

                try {
                    await this.PROFILE_DATABASE.remove({ name });
                } catch (err) {
                    console.log(err);
                    return res.sendStatus(500);
                }

                this.TCPMassSend('Overlay', '-profiles', name, (client) => true);
                
                return res.sendStatus(200);
            });
        
        APIRouter.route('/chatoutput')
            .get(async (req, res, next) => {
                let slice = null;

                try {
                    slice = await this.CHATOUTPT_CACHE.GetCache();
                } catch (err) {
                    console.log(err);
                }

                res.json({ data: slice.find({}) });
            })
            .post(async (req, res, next) => {
                let event = req.body['event'];
                let chatoutput_cfg = req.body['cfg'];
                chatoutput_cfg['event'] = event;

                try {
                    await this.CHATOUTPT_CACHE.insert(chatoutput_cfg, { event });
                } catch (err) {
                    console.log(err);
                    return res.sendStatus(500);
                }
                
                return res.json(chatoutput_cfg);
            })
            .put(async (req, res, next) => {
                let event = req.body['event'];
                let chatoutput_cfg = req.body['cfg'];
                chatoutput_cfg['event'] = event;
                
                try {
                    await this.CHATOUTPT_CACHE.update({ event }, chatoutput_cfg, { upsert: true });
                } catch (err) {
                    console.log(err);
                    return res.sendStatus(500);
                }
                
                return res.json(chatoutput_cfg);
            })
            .delete(async (req, res, next) => {
                let event = req.body['event'];
                
                try {
                    this.CHATOUTPT_CACHE.DeleteCache({ event });
                } catch (err) {
                    console.log(err);
                }
                
                return res.sendStatus(200);
            });
       
        APIRouter.get('/files', (req, res, next) => {
            res.json({ files: this.GetCustomFiles() });
        });
        APIRouter.post('/files', (req, res, next) => {
            let file_info = req.body['file_info'];
            if (!file_info) return res.json({ err: 'File Info not supplied!' });
            
            let file_name = file_info.name;
            if (!file_name) return res.json({ err: 'File Name not supplied!' });

            let file_data = req.body['file_data'];
            if (!file_data) return res.json({ err: 'File Data not supplied!' });

            let extension = file_name.split('.').pop().toLowerCase();

            if (!SUPPORTED_FILES.find(elt => elt === extension)) return res.json({ err: 'Filetype not supported!' });
            
            let cfg = this.Config.GetConfig();
            let file_path = path.resolve(cfg['Custom_File_Dir'] + file_name);
            
            try {
                if (fs.existsSync(file_path)) return res.json({ err: 'File already exists!' });

                if (SUPPORTED_VIDEO_FILES.find(elt => elt === extension)) fs.writeFileSync(file_path, file_data.replace(/^data:video\/\w+;base64,/, ''), { encoding: 'base64' });
                else if (SUPPORTED_IMG_FILES.find(elt => elt === extension)) fs.writeFileSync(file_path, file_data.replace(/^data:image\/\w+;base64,/, ''), { encoding: 'base64' });
                else if (SUPPORTED_SOUND_FILES.find(elt => elt === extension)) fs.writeFileSync(file_path, file_data.replace(/^data:audio\/\w+;base64,/, ''), { encoding: 'base64' });
            } catch (err) {
                return res.sendStatus(500);
            }

            //Check Size
            try {
                let stats = fs.statSync(file_path);
                if (!stats) return res.sendStatus(500);
                if (stats.size === file_info.size) return res.sendStatus(200);
            } catch (err) {
                //Delete Corrupted File
                try {
                    fs.existsSync(file_path);
                } catch (err) {

                }

                return res.json({ err: 'File corrupted! Try again!' });
            }

            res.sendStatus(500);
        });
        APIRouter.delete('/files', (req, res, next) => {
            let cfg = this.Config.GetConfig();
            let file = path.resolve(cfg['Custom_File_Dir'] + req.body['file']);

            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                    res.sendStatus(200);
                } else {
                    res.sendStatus(404);
                }
            } catch (err) {
                console.log(err);
                res.sendStatus(500);
            }
        });

        APIRouter.get('/history', async (req, res, next) => {
            try {
                let docs = await this.AccessFrikyDB(this.HISTORY_DATABASE, {}, req.query['pagination'] || { first: 30, timesorted: true });
                res.json(docs);
            } catch (err) {
                console.log(err);
                res.json({ err: 'Fetching Error' });
            }

            return Promise.resolve();
        });
        APIRouter.put('/history', async (req, res, next) => {
            let old = req.body['event'];

            if (!old || typeof old !== 'object') {
                res.sendStatus(408);
                return Promise.resolve();
            }

            let updated = this.cloneJSON(old);
            updated.seen = true;

            try {
                await this.HISTORY_DATABASE.update(old, updated);
                res.sendStatus(200);
            } catch (err) {
                res.json({ err: '500 - Event couldnt be updated!' });
            }
        });
        APIRouter.delete('/history', async (req, res, next) => {
            if (!req.body['event'] || typeof req.body['event'] !== 'object') {
                res.sendStatus(408);
                return Promise.resolve();
            }

            try {
                await this.HISTORY_DATABASE.remove(req.body['event']);
                res.sendStatus(200);
            } catch (err) {
                res.json({ err: '500 - Event couldnt be removed!' });
            }
        });

        APIRouter.get('/events', async (req, res, next) => {
            try {
                let docs = await this.AccessFrikyDB(this.EVENTS_DATABASE, {}, req.query.paginaton || { first: 30, timesorted: true });
                res.json(docs);
            } catch (err) {
                res.json({ err: 'Fetching Error' });
            }

            return Promise.resolve();
        });
        APIRouter.delete('/events', async (req, res, next) => {
            if (!req.body['event'] || typeof req.body['event'] !== 'object') {
                res.sendStatus(408);
                return Promise.resolve();
            }
            
            try {
                await this.EVENTS_DATABASE.remove(req.body['event']);
                res.sendStatus(200);
            } catch (err) {
                res.json({ err: '500 - Event couldnt be removed!' });
            }
            return Promise.resolve();
        });

        APIRouter.post('/skip', (req, res, next) => {
            let overlay = req.body['overlay'];
            let mode = req.body['mode'] || 'skip';

            if (overlay === undefined) {
                //Send to all Overlays
                this.TCPMassSend('Overlay', mode, Date.now(), (client) => true);
            } else {
                //Send to single Overlay
                this.TCPMassSend('Overlay', mode, Date.now(), (client) => {
                    if (!client.misc) return false;
                    return client.misc.split(',')[0].split(':').pop() === overlay;
                });
            }

            res.sendStatus(200);
        });
        APIRouter.put('/trigger/unseen', async (req, res, next) => {
            let mode = req.query['mode'] || 'all';

            //Query
            let events = [];

            try {
                events = await this.HISTORY_DATABASE.find({ seen: false });
            } catch (err) {
                res.json({ err: '500 - History Database lookup failed.' });
            }

            if (events.length === 0) return res.sendStatus(200);

            events = events.sort((a, b) => a.time - b.time);
            
            //Modes
            if (mode === 'single') {
                //Send
                this.TCPMassSend('Overlay', events[0]['topic'], events[0]);

                //Update DB
                try {
                    await this.HISTORY_DATABASE.update(events[0], { seen: true }, { transform: true });
                } catch (err) {
                    res.json({ err: '500 - History Database update failed.' });
                }
            } else if (mode === 'all') {
                //Send
                for (let event of events) {
                    this.TCPMassSend('Overlay', event['topic'], event);
                }

                //Update DB
                try {
                    await this.HISTORY_DATABASE.updateMany([{ seen: false }], [{ seen: true }], { transform: true });
                } catch (err) {
                    res.json({ err: '500 - History Database update failed.' });
                }
            }

            res.sendStatus(200);
        });
        APIRouter.post('/trigger/:alert', async (req, res, next) => {
            if (!SUPPORTED_ALERTS.find(elt => elt === req.params['alert']) && !SUPPORTED_EVENTS.find(elt => elt === req.params['alert'])) return res.sendStatus(400);

            if (!req.body) req.body = {};
            req.body.is_test = true;
            req.body.seen = this.TCP_Clients > 0;

            //Resub Message
            if (typeof req.body.message === 'string') {
                let roomstates = this.TwitchIRC.getRoomstates() || {};

                //Fetch Emotes
                let messageObj = new TWITCHIRC.Message(this.TwitchIRC.getChannel(), req.body.username.toLowerCase(), req.body.message, { 'room-id': roomstates[this.TwitchIRC.getChannel()]['room-id'] });

                try {
                    await messageObj.extractTTVEmotes(this.TwitchAPI, true);
                } catch (err) {

                }

                try {
                    await messageObj.extractBTTVEmotes();
                } catch (err) {

                }

                try {
                    await messageObj.extractFFZEmotes();
                } catch (err) {

                }

                //Overpower
                let json = messageObj.toJSON();

                //Overpower TTV over FFZ
                if (json['ttv_emotes'] && json['ffz_emotes']) {
                    for (let i = 0; i < json['ffz_emotes'].length; i++) {
                        if (json['ttv_emotes'].find(elt => elt.name === json['ffz_emotes'][i].name)) {
                            json['ffz_emotes'].splice(i, 1);
                        }
                    }
                }

                //Overpower TTV over BTTV
                if (json['ttv_emotes'] && json['bttv_emotes']) {
                    for (let i = 0; i < json['bttv_emotes'].length; i++) {
                        if (json['ttv_emotes'].find(elt => elt.name === json['bttv_emotes'][i].name)) {
                            json['bttv_emotes'].splice(i, 1);
                        }
                    }
                }

                //Overpower FFZ over BTTV
                if (json['ffz_emotes'] && json['bttv_emotes']) {
                    for (let i = 0; i < (json['bttv_emotes'] || []).length; i++) {
                        if (json['ffz_emotes'].find(elt => elt.name === json['bttv_emotes'][i].name)) {
                            json['bttv_emotes'].splice(i, 1);
                        }
                    }
                }

                //Replace
                req.body.message = {
                    text: req.body.message,
                    ttv_emotes: json['ttv_emotes'],
                    ffz_emotes: json['ffz_emotes'],
                    bttv_emotes: json['bttv_emotes']
                };
            }

            //Trigger Alert
            this.TCPMassSend('Overlay', req.params['alert'], req.body);

            //Add to History
            if (req.body.add_history === true) {
                delete req.body['is_test'];
                delete req.body['add_history'];
                if (req.body['time'] === undefined) req.body['time'] = Date.now();

                this.HISTORY_DATABASE.insert(req.body).catch(err => this.Logger.error(req.params['alert'] + " Event couldnt be saved to History!"));
            }

            //Update History
            if (req.body.update_history === true && req.body.seen === false) {
                delete req.body['is_test'];
                delete req.body['update_history'];

                let updated = this.cloneJSON(req.body);
                updated.seen = true;

                this.HISTORY_DATABASE.update(req.body, updated).catch(err => this.Logger.error(req.params['alert'] + " Event couldnt be saved to History!"));
            }

            //Chat Output - pretty much only for testing
            if (req.body.use_chat_output === true) {
                req.body.topic = req.params['alert'];
                this.ChatOutput(req.body);
            }

            res.sendStatus(200);
        });
        
        this.setAuthenticatedAPIRouter(APIRouter, { user_level: 'moderator' });

        //STATIC FILE ROUTE
        let StaticRouter = express.Router();
        StaticRouter.use("/", async (req, res, next) => {
            let url = decodeURI(req.url.split('?')[0].toLowerCase());
            let cfg = this.Config.GetConfig();
            
            if (url.startsWith('/custom/')) {
                try {
                    let page = this.HTMLFileExists(url.substring(8), cfg['Custom_File_Dir']);
                    if (page != "") res.sendFile(page);
                    else res.sendStatus(404);
                } catch (err) {
                    res.sendStatus(404);
                }
            } else if (url.startsWith('/overlay/')) {
                res.sendFile(path.resolve(this.getMainPackageRoot() + 'Alerts/html/Overlay.html'));
            } else {
                let page = this.HTMLFileExists(req.url);
                //Check if File/Dir is Present
                if (page != "") res.sendFile(page);
                else res.redirect("/Alerts");
            }
        });
        super.setFileRouter(StaticRouter);

        //TCP
        this.useTCP('Alerts', (ws, type, data) => this.TCPCallback(ws, type, data));

        //HTML
        this.setWebNavigation({
            name: "Alerts",
            href: this.getHTMLROOT(),
            icon: PACKAGE_DETAILS.picture
        }, "Main", "moderator");


        //Displayables
        this.addDisplayables([
            { name: 'TCP Clients', value: () => this.TCP_Clients.length }
        ]);

        this.SETUP_COMPLETE = true;
        return this.reload();
    }
    async reload() {
        if (!this.isEnabled()) return Promise.reject(new Error("Package is disabled!"));

        try {
            let temp = { name: 'default' };
            for (let key of DEFAULT_ALERT_SETTINGS) temp[key.name] = key.default;
            await this.PROFILE_DATABASE.update({ name: 'default' }, temp, { upsert: true });
        } catch (err) {
            console.log(err);
        }
        
        this.Logger.info("Alerts (Re)Loaded!");
        return Promise.resolve();
    }
    
    async disable() {
        if (!this.isEnabled()) return Promise.resolve();

        this.setEnable(false);
        if (this.isEnabled() !== false) return Promise.reject(new Error('disable failed'));

        //Terminate all TCP Connections
        this.TerminateTCPClients("disable");
        
        this.Logger.warn("Package disabled!");
        return Promise.resolve();
    }
    
    async TCPCallback(ws, type, data) {
        if (data instanceof Object && type === 'register') {
            let miscs = data.misc.split(';');
            let s = "settings:" + JSON.stringify(this.GetConfig());
            let new_misc = '';
            
            for (let misc of miscs) {
                let misc_type = misc.split(':')[0];
                let misc_info = misc.split(':')[1];

                if (misc_type === 'token' && misc_info !== undefined) {
                    try {
                        let overlay = await this.OVERLAY_DATABASE.findOne({ token: misc_info });
                        s += '[<--@-->]overlay:' + JSON.stringify(overlay);
                        
                        //New Misc
                        let new_misc_arr = ['token:' + overlay.token];
                        new_misc_arr.push(Object.getOwnPropertyNames(overlay.settings).join(','));

                        if (new_misc_arr.find(elt => elt === 'hypetrain')) {
                            new_misc_arr.push('sub,resub,giftsub,giftbomb,cheer');
                        }

                        new_misc = new_misc_arr.join(',');

                        //Latest Preload
                        try {
                            if (overlay.type === 'latest' && overlay.settings.general.use_preload === true) {
                                let query = [];
                                for (let event of Object.getOwnPropertyNames(overlay.settings)) if (event !== 'general') query.push({ topic: event });
                                let docs = await this.HISTORY_DATABASE.find({ $or: query });
                                let latest = docs.sort((a, b) => a.time - b.time).pop();

                                s += '[<--@-->]' + latest.topic + ':' + JSON.stringify(latest);

                            }
                        } catch (err) {

                        }

                        //Counter Preload
                        try {
                            if (overlay.type === 'counter') {
                                let counter_topic = Object.getOwnPropertyNames(overlay.settings)[0];
                                let counter_value = 0;

                                if (overlay.settings[counter_topic].interval === 'per_stream') {
                                    counter_value = this.COUNTER_PER_STREAM[counter_topic];
                                } else if (counter_topic === 'sub' && overlay.settings[counter_topic].interval === 'alltime') {
                                    let docs = await this.TwitchAPI.GetBroadcasterSubscriptions({ broadcaster_id: this.TwitchIRC.getRoomID() });
                                    console.log(docs);
                                    counter_value = docs.total || 0;
                                } else if (counter_topic === 'follow' && overlay.settings[counter_topic].interval === 'alltime') {
                                    let docs = await this.TwitchAPI.GetUsersFollows({ to_id: this.TwitchIRC.getRoomID() });
                                    counter_value = docs.total || 0;
                                } else {
                                    let after_date = 0;
                                    let current_date = new Date();
                                    let date_args = [];
                                    let carry = 0;

                                    switch (overlay.settings[counter_topic].interval) {
                                        case 'alltime': {
                                            break;
                                        }
                                        case 'weekly': {
                                            carry = 7;
                                        }
                                        case 'daily': {
                                            date_args.push(current_date.getDate() - carry);
                                        }
                                        case 'monthly': {
                                            date_args.push(current_date.getMonth());
                                        }
                                        case 'yearly': {
                                            date_args.push(current_date.getFullYear());
                                        }
                                        default: {
                                            date_args = date_args.reverse();
                                            if (date_args.length === 1) date_args.push(0);
                                            if (date_args.length === 2) date_args.push(1);
                                            for (let i = date_args.length; i < 7; i++)date_args.push(0);
                                            after_date = (new Date(...date_args)).getTime();
                                        }
                                    }

                                    let query = [{ topic: counter_topic, time: { $gt: after_date } }];
                                    if (counter_topic === 'sub') {
                                        query.push({ topic: 'resub', time: { $gt: after_date } });
                                        query.push({ topic: 'giftsub', time: { $gt: after_date } });
                                        query.push({ topic: 'giftbomb', time: { $gt: after_date } });
                                    } else if (counter_topic === 'giftsub') {
                                        query.push({ topic: 'giftbomb', time: { $gt: after_date } });
                                    }

                                    let docs = await this.HISTORY_DATABASE.find({ $or: query });

                                    for (let doc of docs) {
                                        switch (doc.topic) {
                                            case 'follow':
                                            case 'giftsub':
                                            case 'sub': {
                                                counter_value++;
                                                break;
                                            }
                                            case 'cheer':
                                            case 'giftbomb': {
                                                counter_value += doc.amount || 0;
                                                break;
                                            }
                                        }
                                    }
                                }

                                s += '[<--@-->]' + counter_topic + ':' + JSON.stringify({ value: counter_value || 0 });
                            }
                        } catch (err) {
                            console.log(err);
                        }
                    } catch (err) {
                        let idx = -1;
                        this.TCP_Clients.find((elt, index) => {
                            if (elt.ws === ws) {
                                idx = index;
                                return true;
                            }
                            return false;
                        });
                        if (idx >= 0) this.TCP_Clients.splice(idx, 1);
                        ws.send('overlay:invalid');
                        ws.terminate();
                        return;
                    }

                    try {
                        let profiles = await this.PROFILE_DATABASE.find({ });
                        s += '[<--@-->]profiles:' + JSON.stringify(profiles);
                    } catch (err) {

                    }
                }
            }

            let client = this.TCP_Clients.find(elt => elt.ws === ws);
            if (client && new_misc) {
                client.misc = new_misc;
            }

            ws.send(s);
        } else if (type === 'register') ws.send("settings:" + JSON.stringify(this.GetConfig()));
    }
    TCPMiscEval(client, topic) {
        if (client.misc === 'all') return true;

        if (client.origin === 'Overlay') {
            if (client.misc === 'alerts') return SUPPORTED_ALERTS.find(elt => elt === topic) !== undefined;         //Only Send Alerts if Alerts Requested
            else if (!client.misc.split(',').find(elt => elt === topic)) return false;                              //Only Send Requested Alerts/Events
        }

        return true;
    }

    setEventCallbacks() {
        //Twitch Chat Listener
        this.TwitchIRC.on('join', (channel, user_login, self) => this.Join(channel, user_login, self));

        this.TwitchIRC.on('anongiftpaidupgrade', (channel, message, tags) => this.AnonGiftUpgrade(channel, message, tags));
        this.TwitchIRC.on('giftpaidupgrade', (channel, message, tags) => this.Cheer(channel, message, tags));
        this.TwitchIRC.on('sub', (channel, message, tags) => this.Sub(channel, message, tags));
        this.TwitchIRC.on('resub', (channel, message, tags) => this.ReSub(channel, message, tags));
        this.TwitchIRC.on('subgift', (channel, message, tags) => this.SubGift(channel, message, tags));
        this.TwitchIRC.on('submysterygift', (channel, message, tags) => this.MysterySubGift(channel, message, tags));
        this.TwitchIRC.on('cheer', (channel, user_login, message, tags, self) => this.Cheer(channel, user_login, message, tags, self));

        this.TwitchIRC.on('host', (channel, target, viewers) => this.Host(channel, target, viewers));
        this.TwitchIRC.on('raid', (channel, message, tags) => this.Raid(channel, message, tags));

        //WebHooks
        this.TwitchAPI.AddEventSubCallback('stream.online', this.getName(), (body) => this.StreamOnline(body.event));

        this.TwitchAPI.AddEventSubCallback('channel.follow', this.getName(), (body) => this.FollowEvent(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.subscribe', this.getName(), (body) => {
            //Check IRC Status - when active dont send - when inactive send
            if (this.CheckIRCStatus()) return;

            if (body.event.is_gift === true) this.SubGift(body.event.broadcaster_user_login, body.event.user_name, null, null, { plan: body.event.tier, prime: false }, null);
            else this.Sub(body.event.broadcaster_user_login, body.event.user_name, { plan: body.event.tier, prime: false }, null);
        });
        this.TwitchAPI.AddEventSubCallback('channel.subscription.gift', this.getName(), (body) => {
            //Check IRC Status - when active dont send - when inactive send
            if (this.CheckIRCStatus()) return;

            this.SubGift(body.event.broadcaster_user_login, body.event.user_name, null, null, { plan: body.event.tier, prime: false }, { 'msg-param-sender-count': body.event.cumulative_total, 'display-name': body.event.user_name, 'room-id': body.event.broadcaster_user_id, emotes: body.event.message ? body.event.message.emotes : [] });
        });
        this.TwitchAPI.AddEventSubCallback('channel.subscription.message', this.getName(), (body) => {
            //Check IRC Status - when active dont send - when inactive send
            if (this.CheckIRCStatus()) return;
            this.ReSub(body.event.broadcaster_user_login, body.event.user_name, body.event.duration_months, null, body.event.message ? body.event.message.text : null, { 'msg-param-cumulative-months': body.event.duration_months, 'display-name': body.event.user_name, 'room-id': body.event.broadcaster_user_id, emotes: body.event.message ? body.event.message.emotes : [] }, { plan: body.event.tier, prime: false });
        });
        this.TwitchAPI.AddEventSubCallback('channel.cheer', this.getName(), (body) => {
            //Check IRC Status - when active dont send - when inactive send
            if (this.CheckIRCStatus()) return;

            this.Cheer(body.event.broadcaster_user_login, { 'bits': body.event.bits, 'display-name': body.event.user_name, 'room-id': body.event.broadcaster_user_id, emotes: body.event.message ? body.event.message.emotes : [] }, body.event.message ? body.event.message.text : null);
        });
        this.TwitchAPI.AddEventSubCallback('channel.raid', this.getName(), (body) => {
            //Check IRC Status - when active dont send - when inactive send
            if (this.CheckIRCStatus()) return;

            let channel = this.TwitchIRC.getChannel(true);
            if (channel === body.event.to_broadcaster_user_login) this.Raid(channel, body.event.from_broadcaster_user_login, body.event.viewers);
        });

        this.TwitchAPI.AddEventSubCallback('channel.channel_points_custom_reward_redemption.add', this.getName(), (body) => this.CPR_Add(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.channel_points_custom_reward_redemption.update', this.getName(), (body) => this.CPR_Update(body.event));

        this.TwitchAPI.AddEventSubCallback('channel.poll.begin', this.getName(), (body) => this.PollBegin(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.poll.progress', this.getName(), (body) => this.PollUpdate(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.poll.end', this.getName(), (body) => this.PollEnd(body.event));

        this.TwitchAPI.AddEventSubCallback('channel.prediction.begin', this.getName(), (body) => this.PredictionBegin(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.prediction.update', this.getName(), (body) => this.PredictionUpdate(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.prediction.lock', this.getName(), (body) => this.PredictionLock(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.prediction.end', this.getName(), (body) => this.PredictionEnd(body.event));

        this.TwitchAPI.AddEventSubCallback('channel.hype_train.begin', this.getName(), (body) => this.HypeTrainBegin(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.hype_train.update', this.getName(), (body) => this.HypeTrainUpdate(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.hype_train.end', this.getName(), (body) => this.HypeTrainEnd(body.event));
        
        this.TwitchAPI.AddEventSubCallback('channel.goals.begin', this.getName(), (body) => this.GoalsBegin(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.goals.update', this.getName(), (body) => this.GoalsUpdate(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.goals.end', this.getName(), (body) => this.GoalsEnd(body.event));
    }

    GetCustomFiles() {
        let files = [];
        let cfg = this.Config.GetConfig();

        try {
            files = this.getFilesFromDir(path.resolve(cfg['Custom_File_Dir']));
        } catch (err) {

        }

        return files;
    }
    CheckIRCStatus() {
        return this.TwitchIRC.readyState() === "OPEN";
    }

    async ChatOutput(event = {}) {
        let slice = null;
        //Fetch
        try {
            slice = await this.CHATOUTPT_CACHE.GetCache();
        } catch (err) {
            return Promise.resolve();
        }

        let doc = slice.findOne({ event: event.topic.split('.')[0] });
        if (!doc || doc.enabled !== true) return Promise.resolve();

        let text = "";

        if (SUPPORTED_ALERTS.find(elt => elt === event.topic)) {
            //Find Profile
            let profile = this.findProfileFromAlertCfg(event.topic, doc, event);
            if (!profile) return Promise.resolve();
            text = this.FillFormattedString(profile.text, event);
        } else {
            let variables = {};

            switch (doc.event) {
                case 'poll': {
                    variables = {
                        title: event.title,
                        results: '[Unknown]',
                        choices: [],
                        winner: '[Unknown]',
                        ends: this.relativeTime((new Date(event.ends_at || Date.now())).getTime() - 2000)
                    };

                    for (let choice of event.choices) variables.choices.push(choice.title);
                    variables.choices = variables.choices.join(', ');

                    if (event.ended_at) {
                        variables.winner = event.choices.sort((a, b) => a.votes - b.votes)[event.choices.length - 1].title;
                        variables.results = [];

                        let total = event.choices.reduce((prev, cur) => prev + (cur.votes || 0), 0);

                        for (let choice of event.choices) variables.results.push(choice.title + ' (' + Math.floor(((choice.votes || 0) / total) * 100) + '%)');
                        variables.results = variables.results.join(', ');

                        text = doc.concluded_text;
                    } else {
                        text = doc.created_text;
                    }

                    break;
                }
                case 'hypetrain': {
                    variables = {
                        subs: this.HYPETRAIN_TEMP.subs,
                        bits: this.HYPETRAIN_TEMP.bits,
                        level: this.HYPETRAIN_TEMP.level
                    };

                    if (event.ended_at) {
                        text = doc.concluded_text;
                    } else {
                        text = doc.start_text;
                    }

                    break;
                }
                case 'channel_point_redemption': {
                    variables = {
                        title: event.reward.title,
                        prompt: event.reward.prompt,
                        cost: event.reward.cost,
                        username: event.user_name || event.user_login || 'Unknown',
                        userinput: event.userinput || ''
                    };

                    if (event.status === 'unfulfilled') {
                        text = doc.added_text;
                    } else {
                        text = doc.updated_text;
                    }

                    break;
                }
                case 'prediction': {
                    variables = {
                        title: event.title,
                        outcomes: [],
                        lock_time: this.relativeTime((new Date(event.locks_at || Date.now())).getTime() - 2000),
                        winner: 'In Progress',
                        spent: 0,
                        corrent_spent: 0,
                        wrong_spent: 0,
                        correct_users: '',
                        wrong_users: '',
                        awared: 0
                    };

                    //Outcomes
                    for (let outcome of event.outcomes) variables.outcomes.push(outcome.title);
                    variables.outcomes = variables.outcomes.join(', ');

                    //Spent
                    variables.spent = event.outcomes
                        .reduce((prev, cur) => prev + (cur.channel_points || 0), 0);


                    if (event.ended_at || event.locked_at) {
                        let winner = event.outcomes.find(elt => elt.id + "" === event.winning_outcome_id + "");
                        if (winner) {
                            variables.winner = winner.title;
                            variables.correct_users = [];
                            for (let user of winner.top_predictors) {
                                variables.correct_users.push(user.user_name || user.user_login || 'Unknown');
                                variables.awared += (user.channel_points_won || 0);
                                variables.corrent_spent += user.channel_points_used || 0
                            }
                            variables.correct_users = variables.correct_users.join(', ');
                        }

                        variables.wrong_users = [];

                        for (let outcome of event.outcomes.filter(elt => elt.id + "" !== event.winning_outcome_id + "")) {
                            variables.wrong_spent += (outcome.channel_points || 0);

                            for (let user of outcome.top_predictors) {
                                variables.wrong_users.push(user.user_name || user.user_login || 'Unknown');
                            }
                        }

                        variables.wrong_users = variables.wrong_users.join(', ');

                        variables.spent = variables.corrent_spent + variables.wrong_spent;
                    }

                    if (event.status === 'canceled') {
                        text = doc.canceled_text;
                    } else if (event.ended_at) {
                        text = doc.concluded_text;
                    } else if (event.locked_at) {
                        text = doc.locked_text;
                    } else {
                        text = doc.created_text;
                    }

                    break;
                }
            }

            text = this.FillFormattedString(text || '', variables);
        }

        if (text !== undefined && text !== "") this.TwitchIRC.saySync(text);
    }

    //ChatEvent
    Join(channel, user_login, self) {
        let event = {
            topic: 'join',
            username: user_login,
            seen: null,
            time: Date.now()
        };

        //Increment Counter
        this.COUNTER_PER_STREAM['follow']++;

        //this.HISTORY_DATABASE.insert(event, (err, doc) => { if (err) this.Logger.error("Join Event couldnt be saved to History!"); });
        
        //Dont add Joins to History
        this.TCPMassSend("Overlay", "join", event);

        //Chat Output
        this.ChatOutput(event);
    }

    Sub(channel, message, tags) {
        let event = {
            topic: 'sub',
            username: tags['display-name'] || tags['login'],
            message,
            tier: this.convertPlanToTier(tags['msg-param-sub-plan']),
            seen: this.TCP_Clients.length > 0,
            time: Date.now()
        };

        //Increment Counter
        this.COUNTER_PER_STREAM['sub']++;

        //Add to History
        this.HISTORY_DATABASE.insert(event).catch(err => this.Logger.error("Sub Event couldnt be saved to History!"));
        
        //HypeTrain
        if (this.HYPETRAIN_TEMP) {
            //Fetch User
            try {
                if (tags['user-id']) {
                    let user = this.TwitchAPI.GetUsers({ id: tags['user-id'] });
                    if (user && user.length > 0) event.picture = user[0].profile_image_url;
                }
            } catch (err) {

            }

            this.HYPETRAIN_TEMP.subs++;
            this.HYPETRAIN_TEMP.contributions.push(event);
        }

        //Send to WebHooks
        this.TCPMassSend(["Overlay", "History"], "sub", event);
        
        //Chat Output
        this.ChatOutput(event);
    }
    async ReSub(channel, message, tags) {
        //Get BTTV / FFZ Emotes
        let messageObj = new TWITCHIRC.Message(channel, tags['login'], message, tags);
        
        try {
            await messageObj.extractBTTVEmotes();
        } catch (err) {

        }

        try {
            await messageObj.extractFFZEmotes();
        } catch (err) {

        }

        let json = messageObj.toJSON();
        
        //Overpower TTV over FFZ
        if (json['ttv_emotes'] && json['ffz_emotes']) {
            for (let i = 0; i < json['ffz_emotes'].length; i++) {
                if (json['ttv_emotes'].find(elt => elt.name === json['ffz_emotes'][i].name)) {
                    json['ffz_emotes'].splice(i, 1);
                }
            }
        }

        //Overpower TTV over BTTV
        if (json['ttv_emotes'] && json['bttv_emotes']) {
            for (let i = 0; i < json['bttv_emotes'].length; i++) {
                if (json['ttv_emotes'].find(elt => elt.name === json['bttv_emotes'][i].name)) {
                    json['bttv_emotes'].splice(i, 1);
                }
            }
        }

        //Overpower FFZ over BTTV
        if (json['ffz_emotes'] && json['bttv_emotes']) {
            for (let i = 0; i < (json['bttv_emotes'] || []).length; i++) {
                if (json['ffz_emotes'].find(elt => elt.name === json['bttv_emotes'][i].name)) {
                    json['bttv_emotes'].splice(i, 1);
                }
            }
        }

        //Translate Emotes to API Structure
        let real_message_object = {
            text: message,
            ttv_emotes: json['ttv_emotes'],
            ffz_emotes: json['ffz_emotes'],
            bttv_emotes: json['bttv_emotes']
        };

        let event = {
            topic: 'resub',
            username: tags['display-name'] || tags['login'],
            months: tags['msg-param-cumulative-months'],
            message: real_message_object,  
            streak_months: null,
            tier: this.convertPlanToTier(tags['msg-param-sub-plan']),
            seen: this.TCP_Clients.length > 0,
            time: Date.now()
        };

        //Increment Counter
        this.COUNTER_PER_STREAM['sub']++;

        //Add to History
        this.HISTORY_DATABASE.insert(event).catch(err => this.Logger.error("Resub Event couldnt be saved to History!"));
        
        //HypeTrain
        if (this.HYPETRAIN_TEMP) {
            //Fetch User
            try {
                if (tags['user-id']) {
                    let user = this.TwitchAPI.GetUsers({ id: tags['user-id'] });
                    if (user && user.length > 0) event.picture = user[0].profile_image_url;
                }
            } catch (err) {

            }

            this.HYPETRAIN_TEMP.subs++;
            this.HYPETRAIN_TEMP.contributions.push(event);
        }

        //Send to WebHooks
        this.TCPMassSend(["Overlay", "History"], "resub", event);

        //Chat Output
        this.ChatOutput(event);

        return Promise.resolve();
    }
    SubGift(channel, message, tags) {
        console.log("Gift from " + (tags['display-name'] || tags['login']) + " to " + (tags['msg-param-recipient-display-name'] || tags['msg-param-recipient-user-name']));
        let event = {
            topic: 'giftsub',
            username: tags['display-name'] || tags['login'],
            target: tags['msg-param-recipient-display-name'] || tags['msg-param-recipient-user-name'],
            tier: this.convertPlanToTier(tags['msg-param-sub-plan']),
            total: ~~tags["msg-param-sender-count"],
            origin_id: tags["msg-param-origin-id"],
            time: Date.now()
        };

        //Increment Counter
        this.COUNTER_PER_STREAM['sub']++;
        this.COUNTER_PER_STREAM['giftsub']++;
        
        //Check if part of Bomb
        let bomb = -1;
        this.SUBBOMBS_TEMP.find((elt, index) => {
            if (elt.origin_id === event.origin_id) {
                bomb = index;
                return true;
            }
            return false;
        });
        if (bomb >= 0) {
            this.SUBBOMBS_TEMP[bomb].targets.push(event['target']);
            if (this.SUBBOMBS_TEMP[bomb].targets.length === this.SUBBOMBS_TEMP[bomb].amount) {
                //Add to History
                event.seen = this.TCP_Clients.length > 0;
                this.HISTORY_DATABASE.insert(this.SUBBOMBS_TEMP[bomb]).catch(err => this.Logger.error("Resub Event couldnt be saved to History!"));
                this.TCPMassSend("History", "giftbomb", this.SUBBOMBS_TEMP[bomb]);
                this.SUBBOMBS_TEMP.splice(bomb, 1);
            }
        } else {
            //Add to History
            event.seen = this.TCP_Clients.length > 0;
            this.HISTORY_DATABASE.insert(event).catch(err => this.Logger.error("SubGift Event couldnt be saved to History!"));
            
            //HypeTrain
            if (this.HYPETRAIN_TEMP) {
                //Fetch User
                try {
                    if (tags['user-id']) {
                        let user = this.TwitchAPI.GetUsers({ id: tags['user-id'] });
                        if (user && user.length > 0) event.picture = user[0].profile_image_url;
                    }
                } catch (err) {

                }

                this.HYPETRAIN_TEMP.subs++;
                this.HYPETRAIN_TEMP.contributions.push(event);
            }

            //Send to Webhooks
            this.TCPMassSend(["Overlay", "History"], "giftsub", event);

            //Chat Output
            this.ChatOutput(event);
        }

        if (bomb >= 0) console.log(this.SUBBOMBS_TEMP[bomb]);
        else console.log("No Bomb found.");
    }
    MysterySubGift(channel, message, tags) {
        let event = {
            topic: 'giftbomb',
            username: tags['display-name'] || tags['login'],
            tier: this.convertPlanToTier(tags['msg-param-sub-plan']),
            amount: ~~tags["msg-param-mass-gift-count"],
            total: ~~tags["msg-param-sender-count"],
            targets: [],
            origin_id: tags["msg-param-origin-id"],
            time: Date.now()
        };

        //Increment Counter
        this.COUNTER_PER_STREAM['sub'] += event.amount;
        this.COUNTER_PER_STREAM['giftsub'] += event.amount;
        
        //HypeTrain
        if (this.HYPETRAIN_TEMP) {
            //Fetch User
            try {
                if (tags['user-id']) {
                    let user = this.TwitchAPI.GetUsers({ id: tags['user-id'] });
                    if (user && user.length > 0) event.picture = user[0].profile_image_url;
                }
            } catch (err) {

            }

            this.HYPETRAIN_TEMP.subs += event.amount;
            this.HYPETRAIN_TEMP.contributions.push(event);
        }

        //Send to Webhooks
        this.TCPMassSend("Overlay", "giftbomb", event);

        //Chat Output
        this.ChatOutput(event);

        //Collect Recipients
        this.SUBBOMBS_TEMP.push(event);

        let i = 0;
        let interv = setInterval(() => {
            //Check if part of Bomb
            let bomb = -1;
            this.SUBBOMBS_TEMP.find((elt, index) => {
                if (elt.origin_id === event.origin_id) {
                    bomb = index;
                    return true;
                }
                return false;
            });
            if (bomb >= 0) {
                if (i++ < 1000 && this.SUBBOMBS_TEMP[bomb].targets.length < this.SUBBOMBS_TEMP[bomb].amount) return;

                //Add to History
                event.seen = this.TCP_Clients.length > 0;
                this.HISTORY_DATABASE.insert(this.SUBBOMBS_TEMP[bomb]).catch(err => this.Logger.error("GiftBomb Event couldnt be saved to History!"));
                this.TCPMassSend("History", "giftbomb", this.SUBBOMBS_TEMP[bomb]);
                this.SUBBOMBS_TEMP.splice(bomb, 1);
                clearInterval(interv);
            } else {
                clearInterval(interv);
            }
        }, 1000);
    }
    AnonGiftUpgrade(channel, message, tags) {
        let event = {
            topic: 'upgrade',
            username: tags['display-name'] || tags['login'],
            seen: this.TCP_Clients.length > 0,
            time: Date.now()
        };
        //Add to History
        this.HISTORY_DATABASE.insert(event).catch(err => this.Logger.error("Upgrade Event couldnt be saved to History!"));
        
        //Send to WebHooks
        this.TCPMassSend(["Overlay", "History"], "upgrade", event);

        //Chat Output
        this.ChatOutput(event);
    }
    GiftUpgrade(channel, message, tags) {
        let event = {
            topic: 'upgrade',
            username: tags['msg-param-sender-name'] || tags['msg-param-sender-login'],
            target: tags['display-name'] || tags['login'],
            seen: this.TCP_Clients.length > 0,
            time: Date.now()
        };

        //Add to History
        this.HISTORY_DATABASE.insert(event).catch(err => this.Logger.error("Upgrade Event couldnt be saved to History!"));
        
        //Send to WebHooks
        this.TCPMassSend(["Overlay", "History"], "upgrade", event);

        //Chat Output
        this.ChatOutput(event);
    }
    async Cheer(channel, user_login, message, tags, self) {
        //Get TTV / BTTV / FFZ Emotes
        let messageObj = new TWITCHIRC.Message(channel, user_login, message, tags);

        try {
            await messageObj.ExtractTTVEmotes(this.TwitchAPI, false);
        } catch (err) {

        }

        try {
            await messageObj.getBTTVEmotes();
        } catch (err) {

        }

        try {
            await messageObj.getFFZEmotes();
        } catch (err) {

        }

        try {
            await messageObj.ExtractCheermotes(this.TwitchAPI);
        } catch (err) {

        }

        let json = messageObj.toJSON();

        //Overpower TTV over FFZ
        if (json['ttv_emotes'] && json['ffz_emotes']) {
            for (let i = 0; i < json['ffz_emotes'].length; i++) {
                if (json['ttv_emotes'].find(elt => elt.name === json['ffz_emotes'][i].name)) {
                    json['ffz_emotes'].splice(i, 1);
                }
            }
        }

        //Overpower TTV over BTTV
        if (json['ttv_emotes'] && json['bttv_emotes']) {
            for (let i = 0; i < json['bttv_emotes'].length; i++) {
                if (json['ttv_emotes'].find(elt => elt.name === json['bttv_emotes'][i].name)) {
                    json['bttv_emotes'].splice(i, 1);
                }
            }
        }

        //Overpower FFZ over BTTV
        if (json['ffz_emotes'] && json['bttv_emotes']) {
            for (let i = 0; i < (json['bttv_emotes'] || []).length; i++) {
                if (json['ffz_emotes'].find(elt => elt.name === json['bttv_emotes'][i].name)) {
                    json['bttv_emotes'].splice(i, 1);
                }
            }
        }

        //Translate Emotes to API Structure
        let real_message_object = {
            text: message,
            ttv_emotes: json['ttv_emotes'],
            ffz_emotes: json['ttv_emotes'],
            bttv_emotes: json['ttv_emotes'],
            cheer_emotes: json['cheermotes'],
        };

        //Set Data
        let event = {
            topic: 'cheer',
            username: tags['display-name'] || user_login,
            amount: tags.bits,
            message: real_message_object,
            seen: this.TCP_Clients.length > 0,
            time: Date.now()
        };

        //Increment Counter
        this.COUNTER_PER_STREAM['cheer'] += event.amount;

        //Add to History
        this.HISTORY_DATABASE.insert(event).catch(err => this.Logger.error("Cheer Event couldnt be saved to History!"));
        
        //HypeTrain
        if (this.HYPETRAIN_TEMP) {
            //Fetch User
            try {
                if (tags['user-id']) {
                    let user = this.TwitchAPI.GetUsers({ id: tags['user-id'] });
                    if (user && user.length > 0) event.picture = user[0].profile_image_url;
                }
            } catch (err) {

            }

            this.HYPETRAIN_TEMP.bits += event.amount;
            this.HYPETRAIN_TEMP.contributions.push(event);
        }

        //Send to WebHooks
        this.TCPMassSend(["Overlay", "History"], "cheer", event);
        
        //Chat Output
        this.ChatOutput(event);
    }

    Host(channel, target, viewers) {
        if (channel === this.TwitchIRC.getChannel()) return;
        if (target !== this.TwitchIRC.getChannel()) return;
        
        let event = {
            topic: 'host',
            username: target,
            amount: viewers,
            seen: this.TCP_Clients.length > 0,
            time: Date.now()
        };

        //Add to History
        this.HISTORY_DATABASE.insert(event).catch(err => this.Logger.error("Host Event couldnt be saved to History!"));
        
        //Send to WebHooks
        this.TCPMassSend(["Overlay", "History"], "host", event);

        //Chat Output
        this.ChatOutput(event);
    }
    Raid(channel, message, tags) {
        let event = {
            topic: 'raid',
            username: tags['display-name'] || tags['login'],
            amount: tags['msg-param-viewerCount'],
            seen: this.TCP_Clients.length > 0,
            time: Date.now()
        };

        //Add to History
        this.HISTORY_DATABASE.insert(event).catch(err => this.Logger.error("Raid Event couldnt be saved to History!"));

        event.picture = tags['msg-param-profileImageURL'];

        //Send to WebHooks
        this.TCPMassSend(["Overlay", "History"], "raid", event);

        //Chat Output
        this.ChatOutput(event);
    }
    
    //EventSub
    StreamOnline(event) {
        this.COUNTER_PER_STREAM = {
            sub: 0,
            cheer: 0,
            giftsub: 0,
            follow: 0
        };
    }

    FollowEvent(event) {
        let event_data = {
            topic: 'follow',
            username: event.user_login,
            seen: this.TCP_Clients.length > 0,
            time: Date.now()
        };

        //Add to History
        this.HISTORY_DATABASE.insert(event_data).catch(err => this.Logger.error("Follow Event couldnt be saved to History!"));
        
        //Send to WebHooks
        this.TCPMassSend(["Overlay", "History"], "follow", event_data);
    }
    
    async CPR_Add(event) {
        //Fetch Reward Info
        try {
            let response = await this.TwitchAPI.GetCustomReward({ broadcaster_id: this.TwitchIRC.getRoomID(), id: event.reward.id });
            if (response[0]) {
                if (response[0].image) event.reward.image = response[0].image['url_4x'];
                else event.reward.image = response[0].default_image['url_4x'];
            }
        } catch (err) {

        }
        
        this.TCPMassSend("Overlay", "channel_point_redemption", event);

        event.topic = 'channel_point_redemption.add';

        //Chat Output
        this.ChatOutput(event);
    }
    async CPR_Update(event) {
        //Fetch Reward Info
        try {
            let response = await this.TwitchAPI.GetCustomReward({ broadcaster_id: this.TwitchIRC.getRoomID(), id: event.reward.id });
            if (response[0]) {
                if (response[0].image) event.reward.image = response[0].image['url_4x'];
                else event.reward.image = response[0].default_image['url_4x'];
            }
        } catch (err) {

        }

        this.TCPMassSend("Overlay", "channel_point_redemption", event);

        event.topic = 'channel_point_redemption.update';

        //Chat Output
        this.ChatOutput(event);
    }

    PollBegin(event) {
        this.TCPMassSend("Overlay", "poll", event);

        event.topic = 'poll.begin';

        //Chat Output
        this.ChatOutput(event);
    }
    PollUpdate(event) {
        this.TCPMassSend("Overlay", "poll", event);
    }
    PollEnd(event) {
        //Skip Archived
        if (event.status === 'archived') return;

        let data = this.cloneJSON(event);
        data.topic = 'poll';
        
        //Add to History
        this.EVENTS_DATABASE.insert(data).catch((err) => this.Logger.error("Poll couldnt be saved to History!"));
        this.TCPMassSend("Overlay", "poll", event);
        
        //Chat Output
        this.ChatOutput(data);
    }

    PredictionBegin(event) {
        this.TCPMassSend("Overlay", "prediction", event);
        event.topic = 'prediction.begin';

        //Chat Output
        this.ChatOutput(event);
    }
    PredictionUpdate(event) {
        this.TCPMassSend("Overlay", "prediction", event);
    }
    PredictionLock(event) {
        this.TCPMassSend("Overlay", "prediction", event);

        event.topic = 'prediction.lock';

        //Chat Output
        this.ChatOutput(event);
    }
    PredictionEnd(event) {
        let data = this.cloneJSON(event);
        data.topic = 'prediction';

        //Add to History
        this.EVENTS_DATABASE.insert(data).catch((err) => { this.Logger.error("Prediction couldnt be saved to History!"); });
        this.TCPMassSend("Overlay", "prediction", event);

        data.topic = 'prediction';
        //Chat Output
        this.ChatOutput(data);
    }

    HypeTrainBegin(event) {
        this.HYPETRAIN_TEMP = event;
        this.HYPETRAIN_TEMP.topic = 'hypetrain';
        this.HYPETRAIN_TEMP.subs = 0;
        this.HYPETRAIN_TEMP.bits = 0;
        this.HYPETRAIN_TEMP.contributions = [];

        this.TCPMassSend("Overlay", "hypetrain", this.HYPETRAIN_TEMP);

        event.topic = 'hypetrain.begin';

        //Chat Output
        this.ChatOutput(event);
    }
    HypeTrainUpdate(event) {
        this.HYPETRAIN_TEMP = event;
        this.HYPETRAIN_TEMP.topic = 'hypetrain';
        this.HYPETRAIN_TEMP.subs = 0;
        this.HYPETRAIN_TEMP.bits = 0;
        this.HYPETRAIN_TEMP.contributions = [];

        this.TCPMassSend("Overlay", "hypetrain", this.HYPETRAIN_TEMP);
    }
    HypeTrainEnd(event) {
        this.HYPETRAIN_TEMP = event;
        this.HYPETRAIN_TEMP.topic = 'hypetrain';
        this.HYPETRAIN_TEMP.subs = 0;
        this.HYPETRAIN_TEMP.bits = 0;
        this.HYPETRAIN_TEMP.contributions = [];

        this.TCPMassSend("Overlay", "hypetrain", this.HYPETRAIN_TEMP);
        
        //Add to History
        this.EVENTS_DATABASE.insert(event).catch((err) => {this.Logger.error("Hypetrain couldnt be saved to History!"); });

        this.TCPMassSend("Overlay", "hypetrain", event);

        event.topic = 'hypetrain.end';

        //Chat Output
        this.ChatOutput(event);
        this.HYPETRAIN_TEMP = null;
    }

    GoalsBegin(event) {
        this.TCPMassSend("Overlay", "goal", event);
    }
    GoalsUpdate(event) {
        this.TCPMassSend("Overlay", "goal", event);
    }
    GoalsEnd(event) {
        let data = this.cloneJSON(event);
        data.topic = 'goal';

        //Add to History
        this.EVENTS_DATABASE.insert(data).catch((err) => { this.Logger.error("Goal couldnt be saved to History!"); });
        this.TCPMassSend("Overlay", "goal", event);
    }

    //UTIL
    findProfileFromAlertCfg(type, alert = {}, event = {}) {
        let selection = alert.profiles;

        //Tier
        if (ALERT_VARIABLES[type].find(elt => elt.name === 'tier')) {
            switch (event.tier) {
                case 'Tier 1': selection = selection.filter(elt => elt.where.tier1 === true); break;
                case 'Tier 2': selection = selection.filter(elt => elt.where.tier2 === true); break;
                case 'Tier 3': selection = selection.filter(elt => elt.where.tier3 === true); break;
                case 'Twitch Prime': selection = selection.filter(elt => elt.where.twitchprime === true); break;
            }
        }

        //Username
        if (ALERT_VARIABLES[type].find(elt => elt.name === 'username')) {
            selection = selection.filter(elt => {
                if (elt.where.username && elt.where.username.length > 0 && elt.where.username[0] !== '') {
                    let test = elt.where.username.find(elt2 => elt2 === event.username) !== undefined;
                    return elt.where.inv_username ? !test : test;
                }
                return true;
            });
        }

        //Target
        if (ALERT_VARIABLES[type].find(elt => elt.name === 'target')) {
            selection = selection.filter(elt => {
                if (elt.where.target && elt.where.target.length > 0 && elt.where.target[0] !== '') {
                    let test = elt.where.target.find(elt2 => elt2 === event.target) !== undefined;
                    return elt.where.inv_target ? !test : test;
                }
                return true;
            });
        }

        //Amount
        if (ALERT_VARIABLES[type].find(elt => elt.name === 'amount')) selection = this.sortBounds(selection, 'amount');

        //Total
        if (ALERT_VARIABLES[type].find(elt => elt.name === 'total')) selection = this.sortBounds(selection, 'total');

        //Months
        if (ALERT_VARIABLES[type].find(elt => elt.name === 'months')) selection = this.sortBounds(selection, 'months');
        
        let amount = 0;
        if (event.months !== undefined) amount = event.months;
        if (event.amount !== undefined) amount = event.amount;

        let valid_profiles = [];
        for (let i = 0; i < selection.length; i++) {
            let cur = selection[i];

            if (cur.where.min > amount) continue;
            if (cur.where.max < amount && cur.where.max !== -1) continue;

            valid_profiles.push(cur);
        }
        
        let profile = null;
        if (alert.random) profile = valid_profiles[Math.min(Math.floor(Math.random() * valid_profiles.length), valid_profiles.length - 1)];
        else profile = valid_profiles[0];
        return profile;
    }
    sortBounds(arr = [], pre = 'amount') {
        let smallest = cloneJSONArray(arr)
            .sort((a, b) => a.where[pre + '_min'] - b.where[pre + '_min'])
            .filter(elt => elt.where[pre + '_min'] !== -1 && elt.where[pre + '_max'] !== -1);

        let smallest_upper = cloneJSONArray(arr)
            .sort((a, b) => a.where[pre + '_max'] - b.where[pre + '_max'])
            .filter(elt => elt.where[pre + '_min'] === -1 && elt.where[pre + '_max'] !== -1);

        let biggest_lower = cloneJSONArray(arr)
            .sort((a, b) => a.where[pre + '_min'] - b.where[pre + '_min'])
            .filter(elt => elt.where[pre + '_min'] !== -1 && elt.where[pre + '_max'] === -1);

        let biggest = cloneJSONArray(arr)
            .sort((a, b) => b.where[pre + '_max'] - a.where[pre + '_max'])
            .filter(elt => elt.where[pre + '_min'] === -1 && elt.where[pre + '_max'] === -1);

        //fussion
        return smallest.concat(smallest_upper).concat(biggest_lower).concat(biggest);
    }
    convertPlanToTier(plan, prime) {
        if (plan == 'Prime' || prime) return 'Twitch Prime';
        else {
            try {
                let number = parseInt(plan);
                if (number < 2000) return 'Tier 1';
                else if (number < 3000) return 'Tier 2';
                else if (number >= 3000) return 'Tier 3';
            } catch (err) {

            }
        }

        return 'UNKNOWN TIER';
    }
    relativeTime(t_ms) {
        let rel = Date.now() - t_ms;

        if (rel > 0) {
            if (rel < 60 * 1000) return 'a minute ago';
            else if (rel < 60 * 60 * 1000) return Math.floor(rel / (60 * 1000)) + ' minutes ago';
            else if (rel < 2 * 60 * 60 * 1000) return 'an hour ago';
            else if (rel < 24 * 60 * 60 * 1000) return Math.floor(rel / (60 * 60 * 1000)) + ' hours ago';
        } else {
            rel = -1 * rel;
            if (rel < 60 * 1000) return 'in ' + Math.floor(rel / 1000) + ' seconds';
            else if (rel < 2 * 60 * 1000) return 'in a minute';
            else if (rel < 60 * 60 * 1000) return 'in ' + Math.floor(rel / (60 * 1000)) + ' minutes';
            else if (rel < 2 * 60 * 60 * 1000) return 'in an hour';
            else if (rel < 24 * 60 * 60 * 1000) return 'in ' + Math.floor(rel / (60 * 60 * 1000)) + ' hours';
        }

        let date = new Date(t_ms);
        return date.toLocaleDateString('de-DE') + ' ' + date.toLocaleTimeString('de-DE').split(':').slice(0, 2).join(':');
    }
}

module.exports.DETAILS = PACKAGE_DETAILS;
module.exports.Alerts = Alerts;