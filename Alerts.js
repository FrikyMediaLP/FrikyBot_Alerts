const express = require('express');
const fs = require('fs');
const CONFIGHANDLER = require('./../../Util/ConfigHandler.js');
const crypto = require('crypto');
const Datastore = require('nedb');
const path = require('path');
const TWITCHIRC = require('./../../Modules/TwitchIRC.js');

const PACKAGE_DETAILS = {
    name: "Alerts",
    description: "Sound and Visual Alerts of Subscriptions, Cheers and more.",
    picture: "/images/icons/bell-solid.svg"
};
const SUPPORTED_ALERTS = ['join', 'follow', 'sub', 'resub', 'giftsub', 'giftbomb', 'upgrade', 'cheer', 'host', 'raid'];
const SUPPORTED_EVENTS = [];

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
    { name: 'image', type: 'string', default: '' },
    { name: 'video_volume', type: 'number', default: 50, min: 0, max: 100 },
    { name: 'sound', type: 'string', default: '' },
    { name: 'sound_volume', type: 'number', default: 50, min: 0, max: 100 },
    { name: 'delay', type: 'number', default: 5, min: 0 },
    { name: 'on_time', type: 'number', default: 5, min: 0 },
    { name: 'css', type: 'string', default: '' },
    { name: 'js', type: 'string', default: '' }
];
const ALERT_PROFILE_OPTIONS = {
    'join': [],
    'follow': [],
    'sub': ['tier'],
    'resub': ['tier', 'amount'],
    'giftsub': ['tier', 'target'],
    'giftbomb': ['tier', 'amount'],
    'upgrade': ['tier'],
    'giftupgrade': ['tier'],
    'cheer': ['amount'],
    'host': ['amount'],
    'raid': ['amount']
};

const SUPPORTED_IMG_FILES = ['png', 'jpg', 'jpeg', 'gif', 'mp4'];
const SUPPORTED_VIDEO_FILES = ['mp4'];
const SUPPORTED_SOUND_FILES = ['ogg', 'mp3', 'wav'];
const SUPPORTED_FILES = SUPPORTED_IMG_FILES.concat(SUPPORTED_SOUND_FILES);

class Alerts extends require('./../../Util/PackageBase.js').PackageBase {
    constructor(webappinteractor, twitchirc, twitchapi, logger) {
        super(PACKAGE_DETAILS, webappinteractor, twitchirc, twitchapi, logger);

        this.Config.AddSettingTemplates([
            { name: 'Overlay_Token', type: 'string', requiered: true, default_func: () => this.regenerateOverlayToken(false) },
            { name: 'Custom_File_Dir', type: 'string', default: this.getMainPackageRoot() + this.getName() + "/custom_files/" },
            { name: 'Data_Dir', type: 'string', default: this.getMainPackageRoot() + this.getName() + "/data/" }
        ]);
        this.Config.Load();
        this.Config.FillConfig();

        this.RESTRICTED_HTML_HOSTING = 'moderator';
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

        //Alert Configs
        this.Alerts_Config_List = new CONFIGHANDLER.Config('Alerts', [], { preloaded: this.Config.GetConfig()['Alerts'] });
        for (let alert of SUPPORTED_ALERTS) {
            let profile_default = { name: 'default', text: DEFAULT_ALERT_TEXTS[alert] || '', chat_output: '', where: {} };
            if (ALERT_PROFILE_OPTIONS[alert]) {
                for (let option of ALERT_PROFILE_OPTIONS[alert]) {
                    if (option === 'tier') {
                        profile_default.where.tier1 = true;
                        profile_default.where.tier2 = true;
                        profile_default.where.tier3 = true;
                        profile_default.where.twitchprime = true;
                    } else if (option === 'amount') {
                        profile_default.where.min = -1;
                        profile_default.where.max = -1;
                    }
                }
            }
            
            let child_cfg = new CONFIGHANDLER.Config(alert, [
                { name: 'enabled', type: 'boolean', default: true, requiered: true },
                { name: 'profiles', type: 'array', default: [profile_default], requiered: true }
            ], { preloaded: this.Alerts_Config_List.GetConfig()[alert] });
            this.Alerts_Config_List.AddChildConfig(child_cfg);
        }
        this.Config.AddChildConfig(this.Alerts_Config_List);

        //Profiles
        this.Profiles_Config_List = new CONFIGHANDLER.Config('Profiles', [], { preloaded: this.Config.GetConfig()['Profiles'] });
        if (this.Profiles_Config_List.GetConfig()['default'] === undefined) {
            let child_cfg = new CONFIGHANDLER.Config('default', DEFAULT_ALERT_SETTINGS);
            this.Profiles_Config_List.AddChildConfig(child_cfg);
        }

        let profilesCFG = this.Profiles_Config_List.GetConfig();
        for (let profile in this.Profiles_Config_List.GetConfig()) {
            if (profile === 'default') continue;
            let child_cfg = new CONFIGHANDLER.Config(profile, DEFAULT_ALERT_SETTINGS, { preloaded: profilesCFG[profile] });
            this.Profiles_Config_List.AddChildConfig(child_cfg);
        }

        this.Config.AddChildConfig(this.Profiles_Config_List);
        
        this.Config.Load();
        this.Config.FillConfig();
        
        //Twitch Chat and EventSub Callbacks
        this.setEventCallbacks();

        //Alert History
        this.HISTORY_DATABASE = new Datastore({ filename: path.resolve(cfg['Data_Dir'] + 'history.db'), autoload: true });
        this.EVENTS_DATABASE = new Datastore({ filename: path.resolve(cfg['Data_Dir'] + 'events.db'), autoload: true });

        //Alert Bomb Temp
        this.SUBBOMBS_TEMP = [];
        this.SUBGIFT_TEMP = [];

        //API
        let APIRouter = express.Router();
        
        APIRouter.get('/settings', (req, res, next) => {
            this.Config.FillConfig();
            res.json({
                cfg: this.GetConfig(),
                files: this.GetCustomFiles(),
                hostname: this.WebAppInteractor.GetHostnameAndPort(),
                DEFAULT_ALERT_SETTINGS,
                DEFAULT_ALERT_TEXTS
            });
        });

        APIRouter.patch('/overlay/token', (req, res, next) => {
            let token = this.regenerateOverlayToken();

            let cfg = this.GetConfig();
            if (cfg['Overlay_Token'] !== token) return res.sendStatus(500);

            //Send Invalid info
            //Force Close to Overlay Webhooks
            //this.TCPMassSend('Overlay', 'notice', 'invalid');


            //Send new Token & Hostname
            return res.json({ hostname: this.WebAppInteractor.GetHostnameAndPort(), token });
        });

        APIRouter.route('/profiles')
            .post((req, res, next) => {
                let name = req.body['name'];
                let profile_cfg = req.body['cfg'];

                let alerts_cfg = this.Profiles_Config_List.GetConfig();

                if (!name) return res.json({ err: 'Profile name not found!' });
                if (alerts_cfg[name]) return res.json({ err: 'Profile already exits!' });
                if (!profile_cfg) return res.json({ err: 'Profile Config not found!' });

                let child_cfg = new CONFIGHANDLER.Config(name, DEFAULT_ALERT_SETTINGS, { preloaded: profile_cfg });
                let reponse = this.Profiles_Config_List.AddChildConfig(child_cfg);

                if (reponse !== true) return res.json({ err: reponse });
                this.Config.FillConfig();

                let cfg = this.GetConfig();
                
                this.TCPMassSend('Overlay', 'settings', cfg);

                return res.json({ [name]: cfg.Profiles[name] });
            })
            .put((req, res, next) => {
                let name = req.body['name'];
                let rename = req.body['rename'];
                if (name === 'default') return res.json({ err: 'default cant changed' });
                let profile_cfg = req.body['cfg'];

                let alerts_cfg = this.Profiles_Config_List.GetConfig();

                if (!name) return res.json({ err: 'Profile name not found!' });
                if (!alerts_cfg[name]) return res.json({ err: 'Profile doesnt exits!' });
                if (rename !== undefined && alerts_cfg[rename]) return res.json({ err: 'Profile already exits!' });
                if (!profile_cfg) return res.json({ err: 'Profile Config not found!' });

                //RENAME
                if (rename !== undefined) {
                    let child_cfg = new CONFIGHANDLER.Config(rename, DEFAULT_ALERT_SETTINGS, { preloaded: profile_cfg });
                    let reponse = this.Profiles_Config_List.AddChildConfig(child_cfg);
                    if (reponse !== true) return res.json({ err: reponse });

                    reponse = this.Profiles_Config_List.RemoveChildConfig(name);
                    if (reponse !== true) return res.json({ err: reponse });

                    reponse = this.Profiles_Config_List.UpdateSetting(name);
                    if (reponse !== true) return res.json({ err: reponse });
                    
                    alerts_cfg = this.Profiles_Config_List.GetConfig();
                    return res.json({ [rename]: alerts_cfg[rename] });
                }

                //UPDATE
                let child_cfg = this.Profiles_Config_List.GetChildConfig(name);
                if (!child_cfg) return res.sendStatus(500);

                let reponse = child_cfg.UpdateConfig(profile_cfg);
                if (reponse !== true) return res.json({ err: reponse });
                this.Config.FillConfig();

                let cfg = this.GetConfig();

                this.TCPMassSend('Overlay', 'settings', cfg);

                if (rename) return res.json({ [rename]: cfg.Profiles[rename] });
                return res.json({ [name]: cfg.Profiles[name] });
            })
            .delete((req, res, next) => {
                let name = req.body['name'];
                if (name === 'default') return res.json({ err: 'default cant deleted' });

                let alerts_cfg = this.Profiles_Config_List.GetConfig();

                if (!name) return res.json({ err: 'Profile name not found!' });
                if (!alerts_cfg[name]) return res.json({ err: 'Profile doesnt exits!' });

                let child_cfg = this.Profiles_Config_List.GetChildConfig(name);
                if (!child_cfg) return res.sendStatus(500);

                this.Profiles_Config_List.RemoveChildConfig(name);
                this.Config.FillConfig();

                let reponse = this.Profiles_Config_List.UpdateSetting(name);
                if (reponse !== true) return res.json({ err: reponse });

                let cfg = this.GetConfig();
                this.TCPMassSend('Overlay', 'settings', cfg);
                
                return res.sendStatus(200);
            });

        APIRouter.route('/alerts')
            .put((req, res, next) => {
                let type = req.body['type'];
                let profile_cfg = req.body['cfg'];

                let alerts_cfg = this.Alerts_Config_List.GetConfig();

                if (!type) return res.json({ err: 'Alert name not found!' });
                if (!alerts_cfg[type]) return res.json({ err: 'Alert doesnt exits!' });
                if (!profile_cfg) return res.json({ err: 'Profile Config not found!' });

                let child_cfg = this.Alerts_Config_List.GetChildConfig(type);
                if (!child_cfg) return res.sendStatus(500);

                let reponse = child_cfg.UpdateConfig(profile_cfg);
                if (reponse !== true) return res.json({ err: reponse });

                this.Config.FillConfig();

                let cfg = this.GetConfig();
                this.TCPMassSend('Overlay', 'settings', cfg);
                
                return res.json({ [type]: cfg.Alerts[type] });
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
                let docs = await this.AccessNeDB(this.HISTORY_DATABASE, {}, { first: 30, timesorted: true });
                res.json(docs);
            } catch (err) {
                res.json({ err: 'Fetching Error' });
            }

            return Promise.resolve();
        });
        APIRouter.delete('/history', async (req, res, next) => {
            this.HISTORY_DATABASE.remove({ _id: req.body['id'] }, {}, (err, num) => {
                if (err) res.json({ err: '500 - Event couldnt be removed!' });
                else res.sendStatus(200);
            });
            return Promise.resolve();
        });
        
        APIRouter.get('/events', async (req, res, next) => {

            try {
                let docs = await this.AccessNeDB(this.EVENTS_DATABASE, {}, req.query.paginaton || { first: 30, timesorted: true });
                res.json(docs);
            } catch (err) {
                res.json({ err: 'Fetching Error' });
            }

            return Promise.resolve();
        });
        APIRouter.delete('/events', async (req, res, next) => {
            try {
                this.EVENTS_DATABASE.remove({ _id: req.body['_id'] }, {}, (err, num) => { if (err) res.json({ err: '500 - Event couldnt be removed!' }); });
            } catch (err) {
                res.json({ err: 'Fetching Error' });
            }
            return Promise.resolve();
        });
        
        APIRouter.post('/trigger/:alert', (req, res, next) => {
            if (!SUPPORTED_ALERTS.find(elt => elt === req.params['alert'])) return res.sendStatus(400);

            if (!req.body) req.body = {};
            req.body.is_test = true;

            //Trigger Alert
            this.TCPMassSend('Overlay', req.params['alert'], req.body);

            res.sendStatus(200);
        });
        
        this.setAuthenticatedAPIRouter(APIRouter, { user_level: 'moderator' });
        
        //STATIC FILE ROUTE
        let StaticRouter = express.Router();
        StaticRouter.use("/", (req, res, next) => {
            let url = decodeURI(req.url.split('?')[0].toLowerCase());
            let cfg = this.Config.GetConfig();
            
            if (url.startsWith('/custom/')) {
                let page = path.resolve(cfg['Custom_File_Dir'] + url.substring(8));

                try {
                    if (fs.existsSync(page)) res.sendFile(page)
                    else res.sendStatus(404);
                } catch (err) {
                    res.sendStatus(404);
                }
            } else if (url.startsWith('/overlay/')) {
                if (url.startsWith('/overlay/' + cfg.Overlay_Token)) res.sendFile(path.resolve(this.getMainPackageRoot() + 'Alerts/html/Overlay.html'));
                else res.sendFile(path.resolve(this.getMainPackageRoot() + 'Alerts/html/InvalidOverlay.html'));
            } else {
                let page = this.HTMLFileExists(req.url);
                //Check if File/Dir is Present
                if (page != "") res.sendFile(page);
                else res.redirect("/Alerts");
            }
        });
        super.setFileRouter(StaticRouter);

        //TCP
        this.TCP_Clients = [];
        this.LAST_MESSAGE_ACK = [];
        this.WebAppInteractor.AddTCPCallback('Alerts', (ws, type, data) => this.TCPCallback(ws, type, data));

        //HTML
        this.setWebNavigation({
            name: "Alerts",
            href: this.getHTMLROOT(),
            icon: PACKAGE_DETAILS.picture
        }, "Main", "moderator");


        //Displayables
        this.addDisplayables([
            { name: 'TCP Clients', value: () => this.TCP_Clients.length },
            { name: 'Missing ACKs', value: () => this.LAST_MESSAGE_ACK.length }
        ]);

        this.SETUP_COMPLETE = true;
        return this.reload();
    }
    async reload() {
        if (!this.isEnabled()) return Promise.reject(new Error("Package is disabled!"));
        
        this.Logger.info("Alerts (Re)Loaded!");
        return Promise.resolve();
    }

    TCPRegisterCallback(client) {
        client.ws.send("settings:" + JSON.stringify(this.GetConfig()));
    }
    TCPMiscEval(client, origin, topic) {
        if (origin === 'Overlay') {
            if (client.misc === 'alerts' && !SUPPORTED_ALERTS.find(elt => elt === topic)) return false;                                    //Only Send Alerts if Alerts Requested
            if (client.misc === 'events' && !SUPPORTED_EVENTS.find(elt => elt === topic)) return false;                                    //Only Send Events if Events Requested
            if (client.misc !== 'alerts' && client.misc !== 'events' && !client.misc.split(',').find(elt => elt === topic)) return false;  //Only Send Requested Alerts/Events
        }

        return true;
    }

    setEventCallbacks() {
        //Twitch Chat Listener
        this.TwitchIRC.on('join', (channel, username, self) => this.Join(channel, username, self));

        this.TwitchIRC.on('Anongiftpaidupgrade', (channel, username, userstate) => this.AnonGiftUpgrade(channel, username, userstate));
        this.TwitchIRC.on('Giftpaidupgrade', (channel, username, sender, userstate) => this.Cheer(channel, username, sender, userstate));
        this.TwitchIRC.on('subscription', (channel, username, method, message, userstate) => this.Sub(channel, username, method, message, userstate));
        this.TwitchIRC.on('resub', (channel, username, months, message, userstate, methods) => this.ReSub(channel, username, months, message, userstate, methods));
        this.TwitchIRC.on('subgift', (channel, username, streakMonths, recipient, methods, userstate) => this.SubGift(channel, username, streakMonths, recipient, methods, userstate));
        this.TwitchIRC.on('submysterygift', (channel, username, numbOfSubs, methods, userstate) => this.MysterySubGift(channel, username, numbOfSubs, methods, userstate));
        this.TwitchIRC.on('cheer', (channel, userstate, message) => this.Cheer(channel, userstate, message));

        this.TwitchIRC.on('hosted', (channel, username, viewers, autohost) => this.Host(channel, username, viewers, autohost));
        this.TwitchIRC.on('raided', (channel, username, viewers) => this.Raid(channel, username, viewers));

        //WebHooks
        this.TwitchAPI.AddEventSubCallback('channel.follow', this.getName(), (body) => this.FollowEvent(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.subscribe', this.getName(), (body) => this.SubEvent(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.subscription.gift', this.getName(), (body) => this.GiftSubEvent(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.subscription.message', this.getName(), (body) => this.ReSubEvent(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.cheer', this.getName(), (body) => this.CheerEvent(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.raid', this.getName(), (body) => this.RaidEvent(body.event));

        this.TwitchAPI.AddEventSubCallback('channel.poll.begin', this.getName(), (body) => this.PollBegin(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.poll.update', this.getName(), (body) => this.PollUpdate(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.poll.end', this.getName(), (body) => this.PollEnd(body.event));

        this.TwitchAPI.AddEventSubCallback('channel.prediction.begin', this.getName(), (body) => this.PredictionBegin(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.prediction.update', this.getName(), (body) => this.PredictionUpdate(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.prediction.lock', this.getName(), (body) => this.PredictionLock(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.prediction.end', this.getName(), (body) => this.PredictionEnd(body.event));

        this.TwitchAPI.AddEventSubCallback('channel.hype_train.begin', this.getName(), (body) => this.HypeTrainBegin(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.hype_train.update', this.getName(), (body) => this.HypeTrainUpdate(body.event));
        this.TwitchAPI.AddEventSubCallback('channel.hype_train.end', this.getName(), (body) => this.HypeTrainEnd(body.event));

        //BETA
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
    
    //ChatEvent
    Join(channel, username, self) {
        //Check Settings
        let alerts = this.GetConfig()['Alerts'];

        let event = {
            topic: 'join',
            username,
            seen: null,
            time: Date.now()
        };
        //this.HISTORY_DATABASE.insert(event, (err, doc) => { if (err) this.Logger.error("Join Event couldnt be saved to History!"); });
        
        if (!alerts['join'] || alerts['join'].enabled !== true) return;

        //Chat Output
        let profile = this.findProfileFromAlertCfg(event.topic, alerts[event.topic], event);
        if (profile && profile.chat_output && profile.chat_output !== '') {
            this.TwitchIRC.saySync(this.FillFormattedString(profile.chat_output, event));
        }
        
        //Dont add Joins to History
        this.TCPMassSend("Overlay", "join", event);
    }

    Sub(channel, username, method, message, userstate) {
        //Check Settings
        let alerts = this.GetConfig()['Alerts'];

        let event = {
            topic: 'sub',
            username,
            message,
            tier: this.convertPlanToTier(method.plan, method.prime),
            time: Date.now()
        };

        //Add to History
        this.HISTORY_DATABASE.insert(event, (err, doc) => { if (err) this.Logger.error("Sub Event couldnt be saved to History!"); });

        if (!alerts['sub'] || alerts['sub'].enabled !== true) return this.TCPMassSend("History", "sub", event);
        
        //Chat Output
        let profile = this.findProfileFromAlertCfg(event.topic, alerts[event.topic], event);
        if (profile && profile.chat_output && profile.chat_output !== '') {
            this.TwitchIRC.saySync(this.FillFormattedString(profile.chat_output, event));
        }

        //Send to WebHooks
        this.TCPMassSend(["Overlay", "History"], "sub", event);
    }
    async ReSub(channel, username, months, message, userstate, methods) {
        //MONTHS IS FAKE!!!! Use userstate['msg-param-cumulative-months'] instead
        
        //Check Settings
        let alerts = this.GetConfig()['Alerts'];

        //Get BTTV / FFZ Emotes
        let messageObj = new TWITCHIRC.Message(channel, userstate, message);
        let ffz_emotes = null;
        let bttv_emotes = null;
        
        try {
            bttv_emotes = await messageObj.getBTTVEmotes();
        } catch (err) {

        }

        try {
            ffz_emotes = await messageObj.getFFZEmotes();
        } catch (err) {

        }
        
        //Overpower TTV over FFZ over BTTV
        let ttv_emote_names = [];
        for (let emote_id in userstate.emotes || {}) {
            let place = userstate.emotes[emote_id][0];
            let begin = parseInt(place.split('-')[0]);
            let end = parseInt(place.split('-')[1]);
            ttv_emote_names.push(message.substring(begin, end));
        }

        let ffz_emote_names = [];
        for (let emote_id in ffz_emotes || {}) {
            let place = ffz_emotes[emote_id][0];
            let begin = parseInt(place.split('-')[0]);
            let end = parseInt(place.split('-')[1]);

            let name = message.substring(begin, end);
            ffz_emote_names.push(name);
            if (ttv_emote_names.find(elt => elt === name)) delete ffz_emotes[emote_id];
        }
        
        for (let emote_id in bttv_emotes || {}) {
            let place = ffz_emotes[emote_id][0];
            let begin = parseInt(place.split('-')[0]);
            let end = parseInt(place.split('-')[1]);

            let name = message.substring(begin, end);

            if (ffz_emote_names.find(elt => elt === name)) delete bttv_emotes[emote_id];
        }

        //Translate Emotes to API Structure
        let real_message_object = {
            text: message,
            emotes: this.ConvertIRCEmotesToEventSubEmotes(userstate.emotes),
            ffz_emotes: this.ConvertIRCEmotesToEventSubEmotes(ffz_emotes),
            bttv_emotes: this.ConvertIRCEmotesToEventSubEmotes(bttv_emotes)
        };

        let event = {
            topic: 'resub',
            username,
            months: userstate['msg-param-cumulative-months'],
            message: real_message_object,  
            streak_months: null,
            tier: this.convertPlanToTier(methods.plan, methods.prime),
            time: Date.now()
        };

        //Add to History
        this.HISTORY_DATABASE.insert(event, (err, doc) => { if (err) this.Logger.error("Resub Event couldnt be saved to History!"); });

        if (!alerts['resub'] || alerts['resub'].enabled !== true) return this.TCPMassSend("History", "resub", event);

        //Chat Output
        let profile = this.findProfileFromAlertCfg(event.topic, alerts[event.topic], event);
        if (profile && profile.chat_output && profile.chat_output !== '') {
            this.TwitchIRC.saySync(this.FillFormattedString(profile.chat_output, event));
        }
        
        //Send to WebHooks
        this.TCPMassSend(["Overlay", "History"], "resub", event);
        return Promise.resolve();
    }
    SubGift(channel, username, streakMonths, recipient, methods, userstate) {
        //Check Settings
        let alerts = this.GetConfig()['Alerts'];
        
        let event = {
            topic: 'giftsub',
            username,
            target: recipient,
            tier: this.convertPlanToTier(methods.plan, methods.prime),
            total: ~~userstate["msg-param-sender-count"],
            time: Date.now()
        };
        
        //Check if part of Bomb
        let bomb = -1;
        this.SUBBOMBS_TEMP.find((elt, index) => {
            if (elt.username === event.username) {
                bomb = index;
                return true;
            }
            return false;
        });
        if (bomb >= 0) {
            this.SUBBOMBS_TEMP[bomb].targets.push(recipient);
            if (this.SUBBOMBS_TEMP[bomb].targets === this.SUBBOMBS_TEMP[bomb].amount) {
                //Add to History
                this.HISTORY_DATABASE.insert(this.SUBBOMBS_TEMP[bomb], (err, doc) => { if (err) this.Logger.error("GiftBomb Event couldnt be saved to History!"); });

                this.SUBBOMBS_TEMP.splice(bomb, 1);

                if (!alerts['giftsub'] || alerts['giftsub'].enabled !== true) return this.TCPMassSend("History", "giftsub", event);

                //Chat Output
                let profile = this.findProfileFromAlertCfg("giftbomb", alerts["giftbomb"], this.SUBBOMBS_TEMP[bomb]);
                if (profile && profile.chat_output && profile.chat_output !== '') {
                    this.TwitchIRC.saySync(this.FillFormattedString(profile.chat_output, this.SUBBOMBS_TEMP[bomb]));
                }

                //Send to Webhooks
                this.TCPMassSend(["Overlay", "History"], "giftbomb", this.SUBBOMBS_TEMP[bomb]);
            }
        } else {
            //Add to History
            this.HISTORY_DATABASE.insert(event, (err, doc) => { if (err) this.Logger.error("SubGift Event couldnt be saved to History!"); });

            if (!alerts['giftsub'] || alerts['giftsub'].enabled !== true) return this.TCPMassSend("History", "giftsub", event);

            //Chat Output
            let profile = this.findProfileFromAlertCfg(event.topic, alerts[event.topic], event);
            if (profile && profile.chat_output && profile.chat_output !== '') {
                this.TwitchIRC.saySync(this.FillFormattedString(profile.chat_output, event));
            }

            //Send to Webhooks
            this.TCPMassSend(["Overlay", "History"], "giftsub", event);
        }
    }
    MysterySubGift(channel, username, numbOfSubs, methods, userstate) {
        //Check Settings
        let alerts = this.GetConfig()['Alerts'];

        let event = {
            topic: 'giftbomb',
            username,
            tier: this.convertPlanToTier(methods.plan, methods.prime),
            amount: numbOfSubs,
            total: ~~userstate["msg-param-sender-count"],
            targets: [],
            time: Date.now()
        };
        
        this.SUBBOMBS_TEMP.push(event);

        setTimeout(() => {
            //Check if part of Bomb
            let bomb = -1;
            this.SUBBOMBS_TEMP.find((elt, index) => {
                if (elt.time === event.time) {
                    bomb = index;
                    return true;
                }
                return false;
            });
            if (bomb >= 0) {
                if (this.SUBBOMBS_TEMP[bomb].targets === this.SUBBOMBS_TEMP[bomb].amount) {
                    //Add to History
                    this.HISTORY_DATABASE.insert(this.SUBBOMBS_TEMP[bomb], (err, doc) => { if (err) this.Logger.error("GiftBomb Event couldnt be saved to History!"); });
                    this.SUBBOMBS_TEMP.splice(bomb, 1);

                    if (!alerts['giftbomb'] || alerts['giftbomb'].enabled !== true) return this.TCPMassSend("History", "giftsub", event);

                    //Chat Output
                    let profile = this.findProfileFromAlertCfg("giftbomb", alerts["giftbomb"], this.SUBBOMBS_TEMP[bomb]);
                    if (profile && profile.chat_output && profile.chat_output !== '') {
                        this.TwitchIRC.saySync(this.FillFormattedString(profile.chat_output, this.SUBBOMBS_TEMP[bomb]));
                    }

                    //Send to Webhooks
                    this.TCPMassSend(["Overlay", "History"], "giftbomb", this.SUBBOMBS_TEMP[bomb]);
                }
            }
        }, 1 * 60 * 1000);
    }
    AnonGiftUpgrade(channel, username, userstate) {
        //Check Settings
        let alerts = this.GetConfig()['Alerts'];
        
        let event = {
            topic: 'upgrade',
            username,
            time: Date.now()
        };
        //Add to History
        this.HISTORY_DATABASE.insert(event, (err, doc) => { if (err) this.Logger.error("Upgrade Event couldnt be saved to History!"); });

        if (!alerts['upgrade'] || alerts['upgrade'].enabled !== true) return this.TCPMassSend("History", "upgrade", event);

        //Chat Output
        let profile = this.findProfileFromAlertCfg(event.topic, alerts[event.topic], event);
        if (profile && profile.chat_output && profile.chat_output !== '') {
            this.TwitchIRC.saySync(this.FillFormattedString(profile.chat_output, event));
        }
        
        //Send to WebHooks
        this.TCPMassSend(["Overlay", "History"], "upgrade", event);
    }
    GiftUpgrade(channel, username, sender, userstate) {
        //Check Settings
        let alerts = this.GetConfig()['Alerts'];
        
        let event = {
            topic: 'upgrade',
            username: sender,
            target: username,
            time: Date.now()
        };

        //Add to History
        this.HISTORY_DATABASE.insert(event, (err, doc) => { if (err) this.Logger.error("Upgrade Event couldnt be saved to History!"); });

        if (!alerts['upgrade'] || alerts['upgrade'].enabled !== true) return this.TCPMassSend("History", "upgrade", event);
        //Chat Output
        let profile = this.findProfileFromAlertCfg(event.topic, alerts[event.topic], event);
        if (profile && profile.chat_output && profile.chat_output !== '') {
            this.TwitchIRC.saySync(this.FillFormattedString(profile.chat_output, event));
        }
        
        //Send to WebHooks
        this.TCPMassSend(["Overlay", "History"], "upgrade", event);
    }
    async Cheer(channel, userstate, message) {
        //Check Settings
        let alerts = this.GetConfig()['Alerts'];

        //Get TTV / BTTV / FFZ Emotes
        let messageObj = new TWITCHIRC.Message(channel, userstate, message);
        let ttv_emotes = null;
        let ffz_emotes = null;
        let bttv_emotes = null;
        let cheer_emotes = null;

        try {
            ttv_emotes = await messageObj.ExtractTTVEmotes(this.TwitchAPI, false);
        } catch (err) {

        }

        try {
            bttv_emotes = await messageObj.getBTTVEmotes();
        } catch (err) {

        }

        try {
            ffz_emotes = await messageObj.getFFZEmotes();
        } catch (err) {

        }

        try {
            cheer_emotes = await messageObj.ExtractCheermotes(this.TwitchAPI);
        } catch (err) {

        }

        //Overpower FFZ Emotes over BTTV Emotes
        if (ffz_emotes) {
            for (let emote_code in bttv_emotes) {
                if (ffz_emotes[emote_code]) delete bttv_emotes[emote_code];
            }
        }

        //Translate Emotes to API Structure
        let real_message_object = {
            text: message,
            emotes: this.ConvertIRCEmotesToEventSubEmotes(ttv_emotes),
            ffz_emotes: this.ConvertIRCEmotesToEventSubEmotes(ffz_emotes),
            bttv_emotes: this.ConvertIRCEmotesToEventSubEmotes(bttv_emotes),
            cheer_emotes: this.ConvertIRCEmotesToEventSubEmotes(cheer_emotes, true)
        };

        //Set Data
        let event = {
            topic: 'cheer',
            username: userstate['display-name'] || userstate['username'],
            amount: userstate.bits,
            message: real_message_object,
            time: Date.now()
        };
        //Add to History
        this.HISTORY_DATABASE.insert(event, (err, doc) => { if (err) this.Logger.error("Cheer Event couldnt be saved to History!"); });

        if (!alerts['cheer'] || alerts['cheer'].enabled !== true) return this.TCPMassSend("History", "cheer", event);

        //Chat Output
        let profile = this.findProfileFromAlertCfg(event.topic, alerts[event.topic], event);
        if (profile && profile.chat_output && profile.chat_output !== '') {
            this.TwitchIRC.saySync(this.FillFormattedString(profile.chat_output, event));
        }
        
        //Send to WebHooks
        this.TCPMassSend(["Overlay", "History"], "cheer", event);
    }

    Host(channel, username, viewers, autohost) {
        //Check Settings
        let alerts = this.GetConfig()['Alerts'];
        if (alerts['host'].enabled !== true) return;
        
        let event = {
            topic: 'host',
            username,
            amount: viewers,
            time: Date.now()
        };

        //Add to History
        this.HISTORY_DATABASE.insert(event, (err, doc) => { if (err) this.Logger.error("Host Event couldnt be saved to History!"); });

        if (!alerts['host'] || alerts['host'].enabled !== true) return this.TCPMassSend("History", "host", event);

        //Chat Output
        let profile = this.findProfileFromAlertCfg(event.topic, alerts[event.topic], event);
        if (profile && profile.chat_output && profile.chat_output !== '') {
            this.TwitchIRC.saySync(this.FillFormattedString(profile.chat_output, event));
        }

        //Send to WebHooks
        this.TCPMassSend(["Overlay", "History"], "host", event);
    }
    Raid(channel, username, viewers) {
        //Check Settings
        let alerts = this.GetConfig()['Alerts'];
        if (alerts['raid'].enabled !== true) return;

        let event = {
            topic: 'raid',
            username,
            amount: viewers,
            time: Date.now()
        };

        //Add to History
        this.HISTORY_DATABASE.insert(event, (err, doc) => { if (err) this.Logger.error("Raid Event couldnt be saved to History!"); });

        if (!alerts['raid'] || alerts['raid'].enabled !== true) return this.TCPMassSend("History", "raid", event);

        //Chat Output
        let profile = this.findProfileFromAlertCfg(event.topic, alerts[event.topic], event);
        if (profile && profile.chat_output && profile.chat_output !== '') {
            this.TwitchIRC.saySync(this.FillFormattedString(profile.chat_output, event));
        }

        //Send to WebHooks
        this.TCPMassSend(["Overlay", "History"], "raid", event);
    }
    
    //EventSub
    FollowEvent(event) {
        //Check Settings
        let alerts = this.GetConfig()['Alerts'];

        let event_data = {
            topic: 'follow',
            username: event.user_login,
            time: Date.now()
        };

        //Add to History
        this.HISTORY_DATABASE.insert(event_data, (err, doc) => { if (err) this.Logger.error("Follow Event couldnt be saved to History!"); });

        if (!alerts['follow'] || alerts['follow'].enabled !== true) return this.TCPMassSend("History", "follow", event);

        //Chat Output
        let profile = this.findProfileFromAlertCfg(event_data.topic, alerts[event_data.topic], event_data);
        if (profile && profile.chat_output && profile.chat_output !== '') {
            this.TwitchIRC.saySync(this.FillFormattedString(profile.chat_output, event_data));
        }

        //Send to WebHooks
        this.TCPMassSend(["Overlay", "History"], "follow", event_data);
    }
    SubEvent(event) {
        //Check IRC Status - when active dont send - when inactive send
        if (this.CheckIRCStatus()) return;

        this.Sub(event.broadcaster_user_login, event.user_name, { plan: event.tier, prime: false }, null);
    }
    async ReSubEvent(event) {
        //Check IRC Status - when active dont send - when inactive send
        if (this.CheckIRCStatus()) return;

        this.ReSub(event.broadcaster_user_login, event.user_name, event.duration_months, null, event.message ? event.message.text : null, { 'msg-param-cumulative-months': event.duration_months, 'display-name': event.user_name, 'room-id': event.broadcaster_user_id, emotes: event.message ? event.message.emotes : [] }, { plan: event.tier, prime: false });
    }
    GiftSubEvent(event) {
        //Check IRC Status - when active dont send - when inactive send
        if (this.CheckIRCStatus()) return;

        this.SubGift(event.broadcaster_user_login, event.user_name, null, null, { plan: event.tier, prime: false }, { 'msg-param-sender-count': event.cumulative_total, 'display-name': event.user_name, 'room-id': event.broadcaster_user_id, emotes: event.message ? event.message.emotes : [] });
    }
    async CheerEvent(event) {
        //Check IRC Status - when active dont send - when inactive send
        if (this.CheckIRCStatus()) return;
        
        this.Cheer(event.broadcaster_user_login, { 'bits': event.bits, 'display-name': event.user_name, 'room-id': event.broadcaster_user_id, emotes: event.message ? event.message.emotes : [] }, event.message ? event.message.text : null);
    }
    RaidEvent(event) {
        //Check IRC Status - when active dont send - when inactive send
        if (this.CheckIRCStatus()) return;

        let channel = this.TwitchIRC.getChannel(true);
        if (channel === event.to_broadcaster_user_login) this.Raid(channel, event.from_broadcaster_user_login, event.viewers);
    }

    PollBegin(event) {
        let data = this.cloneJSON(event);
        data.topic = 'poll.begin';
        data.time = Date.now();

        //Add to History
        this.HISTORY_DATABASE.insert(data, (err, doc) => { if (err) this.Logger.error("Poll Begin Event couldnt be saved to History!"); });
        this.TCPMassSend("Overlay", "poll.begin", event);
    }
    PollUpdate(event) {
        this.TCPMassSend("poll.update", event);
    }
    PollEnd(event) {
        this.TCPMassSend("poll.end", event);
    }

    PredictionBegin(event) {
        this.TCPMassSend("prediction.begin", event);
    }
    PredictionUpdate(event) {
        this.TCPMassSend("prediction.update", event);
    }
    PredictionLock(event) {
        this.TCPMassSend("prediction.lock", event);
    }
    PredictionEnd(event) {
        this.TCPMassSend("prediction.end", event);
    }

    HypeTrainBegin(event) {
        this.TCPMassSend("hypetrain.begin", event);
    }
    HypeTrainUpdate(event) {
        this.TCPMassSend("hypetrain.update", event);
    }
    HypeTrainEnd(event) {
        let event_data = {
            type: 'hypetrain',
            event: event
        };

        //Add to History
        this.EVENTS_DATABASE.insert(event_data, (err, doc) => { if (err) this.Logger.error("Hypetrain End Event couldnt be saved to History!"); });
        this.TCPMassSend("hypetrain.end", event);
    }

    GoalsBegin(event) {
        this.TCPMassSend("goals.begin", event);
    }
    GoalsUpdate(event) {
        this.TCPMassSend("goals.update", event);
    }
    GoalsEnd(event) {
        let event_data = {
            type: 'goal',
            event: event
        };

        //Add to History
        this.EVENTS_DATABASE.insert(event_data, (err, doc) => { if (err) this.Logger.error("Goal End Event couldnt be saved to History!"); });
        this.TCPMassSend("goals.end", event);
    }

    //UTIL
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
    regenerateOverlayToken(updateConfig = true) {
        let token = crypto.randomBytes(16).toString('hex');
        if (updateConfig) this.Config.UpdateSetting('Overlay_Token', token);
        return token;
    }
    DateToNumber(date_string = "") {
        try {
            return (new Date(date_string)).getTime();
        } catch (err) {
            return null;
        }
    }
    ConvertIRCEmotesToEventSubEmotes(emotes = {}, is_cheer = false) {
        let es_emotes = [];
        for (let id in emotes) {
            let places = emotes[id];
            if (is_cheer) places = emotes[id].places;
            
            for (let place of places) {
                try {
                    let begin = parseInt(place.split('-')[0]);
                    let end = parseInt(place.split('-')[1]);
                    if (is_cheer) es_emotes.push({ begin, end, id, images: emotes[id].images });
                    else es_emotes.push({ begin, end, id });
                } catch (err) {

                }
            }
        }
        return es_emotes;
    }

    findProfileFromAlertCfg(type, alert = {}, event = {}) {
        let selection = alert.profiles;

        if (ALERT_PROFILE_OPTIONS[type].find(elt => elt === 'tier')) {
            switch (event.tier) {
                case 'Tier 1': selection = selection.filter(elt => elt.where.tier1 === true); break;
                case 'Tier 2': selection = selection.filter(elt => elt.where.tier2 === true); break;
                case 'Tier 3': selection = selection.filter(elt => elt.where.tier3 === true); break;
                case 'Twitch Prime': selection = selection.filter(elt => elt.where.twitchprime === true); break;
            }
        }

        if (ALERT_PROFILE_OPTIONS[type].find(elt => elt === 'amount')) selection = this.sortBounds(selection);

        let amount = 0;
        if (event.months !== undefined) amount = event.months;
        if (event.amount !== undefined) amount = event.amount;

        let profile = null;
        for (let i = 0; i < selection.length; i++) {
            let cur = selection[i];

            if (cur.where.min > amount) continue;
            if (cur.where.max < amount && cur.where.max !== -1) continue;
            profile = cur;
            break;
        }

        return profile;
    }
    sortBounds(arr = []) {
        let smallest = this.cloneJSONArray(arr)
            .sort((a, b) => a.where.min - b.where.min)
            .filter(elt => elt.where.min !== -1 && elt.where.max !== -1);

        let smallest_upper = this.cloneJSONArray(arr)
            .sort((a, b) => a.where.max - b.where.max)
            .filter(elt => elt.where.min === -1 && elt.where.max !== -1);

        let biggest_lower = this.cloneJSONArray(arr)
            .sort((a, b) => a.where.min - b.where.min)
            .filter(elt => elt.where.min !== -1 && elt.where.max === -1);

        let biggest = this.cloneJSONArray(arr)
            .sort((a, b) => b.where.max - a.where.max)
            .filter(elt => elt.where.min === -1 && elt.where.max === -1);

        //fussion
        return smallest.concat(smallest_upper).concat(biggest_lower).concat(biggest);
    }
}

module.exports.Alerts = Alerts;