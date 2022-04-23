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
        { name: 'months', desc: 'The amount of months a user has been subscribed for.', type: 'number' }
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

let FILES = [];
let PROFILES = {};
let ALERTS = {};
let DEFAULT_ALERT_SETTINGS = [];
let DEFAULT_ALERT_TEXTS = {};

let VOICES = [];

const TEXT_ALERT_EVENT = {
    topic: 'resub',
    username: "Username",
    months: Math.floor(Math.random() * 20) + 1,
    message: {
        text: "frikymEZ User Message with Emotes dhaluDab",
        emotes: [{ begin: 0, end: 7, id: "300073784" }, { begin: 34, end: 42, id: "emotesv2_a90de641996f4bf19368608c9ef72f35" }],
        btttv_emotes: [],
        ffz_emotes: []
    },
    streak_months: null,
    tier: "Tier 1",
    time: 1646343392200
};

function init() {
    OUTPUT_create();
    SWITCHBUTTON_AUTOFILL();
    MISC_SELECT_WidthCheck_All();
    
    fetchSetting()
        .then(json => {
            FILES = json.files;
            ALERTS = json.cfg.Alerts;
            PROFILES = json.cfg.Profiles;
            DEFAULT_ALERT_SETTINGS = json.DEFAULT_ALERT_SETTINGS;
            DEFAULT_ALERT_TEXTS = json.DEFAULT_ALERT_TEXTS;

            //Create Buttons to test trigger Alerts using json.SUPPORTED_ALERTS
            let s = '';
            for (let alert in ALERTS) s += '<button onclick="Test_Alert(' + "'" + alert + "'" + ')" ' + (ALERTS[alert].enabled ? '' : 'disabled') + '>Test ' + alert.charAt(0).toUpperCase() + alert.substring(1) + '</button>';
            document.getElementById('ALERTS_TEST_UI').innerHTML = s;

            //Overlay Open Button
            document.getElementById('ALERTS_OVERLAY_PAGE_LINK').value = window.location.origin + "/Alerts/overlay/" + json.cfg.Overlay_Token;

            //Alerts
            s = "";
            for (let alert in ALERTS) s += '<div>' + alert.toUpperCase() + '</div>';
            document.getElementById('ALERT_OVERLAYS_ALERTS_POOL').innerHTML = s;

            //Profiles
            updateProfilePool(Object.getOwnPropertyNames(PROFILES));

            //Show
            document.getElementById('ALERTS').style.display = 'block';
        })
        .then(GetVoices)
        .then(voices => {
            VOICES = voices;
            document.getElementById('TTS_VOICE_SELECT').innerHTML = MISC_SELECT_create(VOICES.reduce((total, currentValue) => {
                total.push(currentValue.name);
                return total;
            }, []));
        })
        .catch(err => {
            OUTPUT_showError(err.message);
            console.log(err.message);
        })
        .finally(() => {
            SWITCHBUTTON_AUTOFILL();
            MISC_SELECT_WidthCheck_All();
        });


}
async function fetchSetting() {
    return fetch('/api/Alerts/settings', getAuthHeader()).then(STANDARD_FETCH_RESPONSE_CHECKER);
}

//Test Alerts
function Test_Alert(type, data) {
    if (!data) {

        let tier = 'Unknown';
        switch (Math.floor(Math.random() * 4)) {
            case 0: tier = 'Tier 1'; break;
            case 1: tier = 'Tier 2'; break;
            case 2: tier = 'Tier 3'; break;
            case 3: tier = 'Twitch Prime'; break;
        }

        data = {
            username: LOGIN_getUsername() || 'Text User',
            amount: Math.floor(Math.random() * 100) + 1,
            months: Math.floor(Math.random() * 100) + 1,
            tier,
            target: 'Target'
        };
    }
    
    let opts = getAuthHeader();
    opts.method = 'POST';
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(data);

    //Save
    fetch('/api/alerts/trigger/' + type, opts)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            OUTPUT_showInfo('Test Alert send!');
        })
        .catch(err => {
            console.log(err);
            OUTPUT_showError(err.message);
        });
}

//Alert Overlay Page
function Alert_Overlay_Page_reset() {
    document.getElementById('ALERTS_OVERLAY_PAGE').childNodes[1].value = "";

    //Request new Token
    let opts = getAuthHeader();
    opts.method = 'PATCH';
    opts.headers['Content-Type'] = 'application/json';

    //Save
    fetch('/api/alerts/overlay/token', opts)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            if (json.err) return Promise.reject(new Error(json.err));
            OUTPUT_showInfo('Overlay URL Updated!');
            document.getElementById('ALERTS_OVERLAY_PAGE_LINK').value = window.location.origin + "/Alerts/overlay/" + json.token;
        })
        .catch(err => {
            console.log(err);
            OUTPUT_showError(err.message);
        });
}

//Alerts
function expandAlerts(elt) {
    elt.parentElement.classList.toggle('expand');
}
async function selectAlert(elt, e) {
    //Await Confirmation
    let answer = document.getElementById('ALERT_SAVE_BUTTON').hasAttribute('disabled') ? 'IGNORE' : 'CANCEL';

    try {
        if (answer !== 'IGNORE') answer = await MISC_USERCONFIRM("YOU SURE YOU WANT THIS?", "Switching Alerts now will reset all unsaved Changes! Be sure to save, if you want to keep these changes!", ['IGNORE', 'CANCEL']);
    } catch (err) {

    }

    if (answer !== 'IGNORE') return Promise.resolve();
    elt.parentElement.classList.remove('expand');

    let alert = ALERTS[e.target.innerHTML.toLocaleLowerCase()];
    if (!alert) return;

    elt.parentElement.childNodes[1].innerHTML = e.target.innerHTML;
    showAlert(e.target.innerHTML.toLocaleLowerCase());
    document.getElementById('ALERT_OVERLAYS_ALERTS_SETTINGS').style.display = 'block';
    Alerts_SetSaveState(false);
}
function selectAlertProfile(elt, e) {
    elt.parentElement.classList.remove('expand');
    let profile = PROFILES[e.target.innerHTML];
    if (!profile) return;
    
    elt.parentElement.childNodes[0].innerHTML = e.target.innerHTML;
    document.getElementById('ALERT_SAVE_BUTTON').removeAttribute('disabled');
}

function showAlert(alert_name = "", alert_info) {
    if (!alert_info) alert_info = ALERTS[alert_name.toLocaleLowerCase()];
    if (!alert_info) return;

    SWITCHBUTTON_TOGGLE(document.getElementById('ALERT_ENABLE_BUTTON'), alert_info.enabled === true);

    let s = "";
    for (let profile of sortAlertProfiles(alert_info.profiles)) {
        s += '<div class="ALERT_OVERLAYS_ALERTS_SETTINGS_PROFILE">';
        s += createAlertProfile(profile, alert_name);
        s += '</div>';
    }

    document.getElementById('ALERT_OVERLAYS_ALERTS_SETTINGS_PROFILES').innerHTML = s;
    setTimeout(SWITCHBUTTON_AUTOFILL, 1000);
    MISC_SELECT_WidthCheck_All();
}
function updateAlertsPools() {
    for (let elt of document.getElementsByClassName('ALERT_PROFILES_POOL')) {
        let name = elt.childNodes[0];
        if (name.innerHTML.startsWith('<span')) name = name.childNodes[0];
        name = name.innerHTML;

        if (PROFILES[name] === undefined) {
            name = '<span style="color: red;">' + name + '</span>';
        }

        elt.childNodes[0].innerHTML = name;
        
        let s = "";
        for (let profile in PROFILES) s += '<div title="' + profile + '">' + profile + '</div>';
        elt.childNodes[2].innerHTML = s;
    }
}

function addProfileOption() {
    let div = document.createElement('DIV');
    div.classList.add('ALERT_OVERLAYS_ALERTS_SETTINGS_PROFILE');
    div.innerHTML = createAlertProfile({}, document.getElementById('ALERT_OVERLAYS_ALERTS_SELECT').childNodes[1].innerHTML.toLowerCase());

    document.getElementById('ALERT_OVERLAYS_ALERTS_SETTINGS_PROFILES').appendChild(div);
    Alerts_SetSaveState(true);
}
function removeAlertProfile(elt) {
    elt.parentElement.parentElement.remove();
    Alerts_SetSaveState(true);
}

function createAlertProfile(preload = {}, type = "") {
    let s = '';

    let name = preload.name ? PROFILES[preload.name] === undefined : false;
    if (preload.name ? PROFILES[preload.name] === undefined : false) {
        name = '<span style="color: red;">' + preload.name + '</span>';
    } else if (preload.name) {
        name = preload.name;
    } else {
        name = 'Select Profile';
    }

    s += '<div class="HeaderSelecThing ALERT_PROFILES_POOL">';
    s += '<div onclick="expandAlerts(this)">' + name + '</div><img src="/images/icons/trash-alt-solid.svg" onclick="removeAlertProfile(this)" />';
    s += '<div onclick="selectAlertProfile(this, event)" >';

    for (let profile in PROFILES) s += '<div title="' + profile + '">' + profile + '</div>';
    s += '</div>';
    s += '</div>';


    s += '<div class="ALERT_OVERLAYS_ALERTS_SETTINGS_PROFILE_OPTION">';
    s += '<div>Alert Text</div>';
    s += '<input type="text" value="' + (preload.text === undefined ? DEFAULT_ALERT_TEXTS[type] : preload.text) + '" oninput="Alerts_SetSaveState(true)"/>';
    s += '</div>';

    s += '<div class="ALERT_OVERLAYS_ALERTS_SETTINGS_PROFILE_OPTION">';
    s += '<div>Chat Output</div>';
    s += '<input type="text" placeholder="No Chat Output" value="' + (preload.chat_output || '') + '" oninput="Alerts_SetSaveState(true)"/>';
    s += '</div>';
    
    if (!ALERT_PROFILE_OPTIONS[type]) return s + '</div>';

    for (let option of ALERT_PROFILE_OPTIONS[type]){
        if (option === 'tier') {
            s += '<div class="ALERT_OVERLAYS_ALERTS_SETTINGS_PROFILE_OPTION" data-type="tier">';
            s += '<div>Trigger at Sub Tier</div>';

            let where = preload.where || {};

            s += '<div class="TierList">';
            s += '<div><div>Tier 1</div><input type="checkbox" ' + (where.tier1 ? 'checked' : '')  + ' onchange="Alerts_SetSaveState(true)"/></div>';
            s += '<div><div>Tier 2</div><input type="checkbox" ' + (where.tier2 ? 'checked' : '') + '  onchange="Alerts_SetSaveState(true)"/></div>';
            s += '<div><div>Tier 3</div><input type="checkbox" ' + (where.tier3 ? 'checked' : '') + '  onchange="Alerts_SetSaveState(true)"/></div>';
            s += '<div><div>Tier Prime</div><input type="checkbox" ' + (where.twitchprime ? 'checked' : '') + '  onchange="Alerts_SetSaveState(true)"/></div>';
            s += '</div>';

            s += '</div>';
        } else if (option === 'amount') {
            let where = preload.where || {};

            s += '<div class="ALERT_OVERLAYS_ALERTS_SETTINGS_PROFILE_OPTION" data-type="amount">';
            s += '<div>Trigger Range</div>';
            s += '<div class="Range">';
            s += '<div><span>from: </span><input type="number" min="-1" value="' + (where.min !== undefined ? where.min : -1) + '" placeholder="Lower Range Bounds here" oninput="Alerts_SetSaveState(true)"/></div>';
            s += '<div><span>to: </span><input type="number" min="-1" value="' + (where.max !== undefined ? where.max : -1) + '" placeholder="Upper Range Bounds here" oninput="Alerts_SetSaveState(true)"/></div>';
            s += '</div>';
            s += '<div class="info">Use a value of -1 to indicate any value below/above!</div>';
            s += '</div>';
        }
    }
    
    return s;
}

function Alert_collectJSON() {
    let cfg = {
        enabled: document.getElementById('ALERT_ENABLE_BUTTON').value,
        profiles: []
    };

    for (let elt of document.getElementById('ALERT_OVERLAYS_ALERTS_SETTINGS_PROFILES').childNodes) {
        let name = elt.childNodes[0].childNodes[0];
        if (name.innerHTML.startsWith('<span')) name = elt.childNodes[0];

        let where = {};
        for (let option of elt.childNodes) {
            if (!(option instanceof Element && option.classList.contains('ALERT_OVERLAYS_ALERTS_SETTINGS_PROFILE_OPTION'))) continue;

            if (option.dataset.type === 'tier') {
                where.tier1 = option.childNodes[1].childNodes[0].childNodes[1].checked;
                where.tier2 = option.childNodes[1].childNodes[1].childNodes[1].checked;
                where.tier3 = option.childNodes[1].childNodes[2].childNodes[1].checked;
                where.twitchprime = option.childNodes[1].childNodes[3].childNodes[1].checked;
            } else if (option.dataset.type === 'amount') {
                where.min = parseInt(option.childNodes[1].childNodes[0].childNodes[1].value);
                where.max = parseInt(option.childNodes[1].childNodes[1].childNodes[1].value);
            }
        }

        cfg.profiles.push({
            name: name.innerHTML === 'Select Profile' ? '' : name.innerHTML,
            text: elt.childNodes[1].childNodes[1].value,
            chat_output: elt.childNodes[2].childNodes[1].value,
            where
        });
    }

    return cfg;
}
function checkAlertProfileConfig(cfg = {}) {
    let sorted = sortBounds(cfg.profiles);

    for (let i = 0; i < sorted.length; i++) {
        let elt = sorted[i];
        
        if (!elt.name || elt.name.split(' ').join('') == '' || elt.name === 'Select Profile') {
            return 'An Option has no Profile selected!';
        }
        
        if (elt.where.tier1 !== undefined) {
            if (elt.where.tier1 == false && elt.where.tier2 == false && elt.where.tier3 == false && elt.where.twitchprime == false) {
                return 'Profile has no Tier Trigger assigned!';
            }
        }

        if (elt.where.min !== -1 && elt.where.max !== -1) {
            if (elt.where.min > elt.where.max) {
                return 'Profile has unlogical Range!';
            }
        }

        if (i < sorted.length - 1 && elt.where.min !== undefined) {
            let next = sorted[i + 1];

            if (elt.where.tier1 == next.where.tier1 && elt.where.tier2 == next.where.tier2 && elt.where.tier3 == next.where.tier3 && elt.where.twitchprime == next.where.twitchprime) {
                if (elt.where.min === next.where.min && elt.where.max === next.where.max) {
                    return 'Profile has duplicate Trigger Range!';
                }
            }
        }
    }

    return true;
}
function sortAlertProfiles(profiles = [], type = "") {
    if (type === 'resub' || type === 'giftbomb' || type === 'cheer' || type === 'host' || type === 'raid') {
        return sortBounds(profiles);
    } 
    return cloneJSONArray(profiles);
}
function Alerts_SetSaveState(state = false) {
    let elt = document.getElementById('ALERT_SAVE_BUTTON');
    if (state) elt.removeAttribute('disabled');
    else elt.setAttribute('disabled', 'true');
}

function Alert_Save() {
    let type = document.getElementById('ALERT_OVERLAYS_ALERTS_SELECT').childNodes[1].innerHTML.toLowerCase();

    let cfg = Alert_collectJSON();
    Alerts_SetSaveState(false);

    //Check Errors
    let error = checkAlertProfileConfig(cfg);
    if (error !== true) {
        OUTPUT_showError('Error: ' + error);
        Alerts_SetSaveState(true);
        return;
    }
    
    let opts = getAuthHeader();
    opts.method = 'PUT';
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify({ type, cfg });
    
    //Save
    fetch('/api/alerts/alerts', opts)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            if (json.err) return Promise.reject(new Error(json.err));
            OUTPUT_showInfo('Alert Changed!');
            ALERTS[Object.getOwnPropertyNames(json)[0]] = json[Object.getOwnPropertyNames(json)[0]];
        })
        .catch(err => {
            Alerts_SetSaveState(true);
            console.log(err);
            OUTPUT_showError(err.message);
        });
}

/* Profiles */
function expandProfiles(elt, e) {
    if (e.target.tagName === 'INPUT') return;
    elt.parentElement.classList.toggle('expand');
}
async function selectProfile(elt, e) {
    e.stopPropagation();

    //Await Confirmation
    let answer = document.getElementById('ALERT_OVERLAY_SAVE_BUTTON').hasAttribute('disabled') ? 'IGNORE' : 'CANCEL';

    try {
        if (answer !== 'IGNORE') answer = await MISC_USERCONFIRM("YOU SURE YOU WANT THIS?", "Duplicating this Profile now will reset all unsaved Changes! Be sure to save, if you want to keep these changes!", ['IGNORE', 'CANCEL']);
    } catch (err) {

    }

    if (answer !== 'IGNORE') return Promise.resolve();

    elt.parentElement.classList.remove('expand');
    if (e.target.hasAttribute('new')) {
        newProfile({});
        return;
    } else if (e.target.hasAttribute('import')) {
        OpenImportDialog();
        return;
    }

    let profile = PROFILES[e.target.innerHTML];
    if (!profile) return;

    elt.parentElement.childNodes[1].innerHTML = '<input type="text" data-default="' + e.target.innerHTML + '" value="' + e.target.innerHTML + '" oninput="OverlaySettings_SetSaveState(true)" />';
    createOverlaySetting(profile);
    document.getElementById('ALERT_OVERLAYS_WRAPPER').style.display = "grid";
    document.getElementById('ALERT_OVERLAY_SAVE_BUTTON').dataset.new = false;
    OverlaySettings_SetSaveState(false);
    OverlaySettingSwitchTab();
}
function newProfile(preloaded = {}, name = "New Profile") {
    while (PROFILES[name]) {
        let idx = name.split(" ").pop();
        if (isNaN(idx)) name += " 1";
        else name = name.split(" ").pop().join(' ') + " " + (parseInt(idx) + 1);
    }

    document.getElementById('ALERT_OVERLAYS_PROFILES_SELECT').childNodes[1].innerHTML = '<input type="text" data-default="' + name  + '" value="' + name + '" oninput="OverlaySettings_SetSaveState(true)"/>';;
    createOverlaySetting(preloaded);
    document.getElementById('ALERT_OVERLAYS_WRAPPER').style.display = "grid";
    OverlaySettings_SetSaveState(true);
    document.getElementById('ALERT_OVERLAY_SAVE_BUTTON').dataset.new = true;
    OverlaySettingSwitchTab();
}
function OverlaySettings_ImportProfile(cfg, profile_name) {
    //Check Json (just show error)
    let error = OverlaySettings_checkJSON(cfg);
    if (error !== true) {
        OUTPUT_showError('Error: ' + error);
    }

    //Display Settings
    newProfile(cfg, profile_name);
}
function OpenImportDialog() {
    let div = document.createElement('DIV');
    div.id = 'PROFILE_IMPORT_DIALOG';
    div.innerHTML = '<center>Copy Profile Settings here</center><textarea oninput="ImportDialogInput(this)"></textarea>';
    document.getElementById('grid').appendChild(div);
    disableContent('removeImportDialogHTML', true);
}
function removeImportDialogHTML() {
    document.getElementById('PROFILE_IMPORT_DIALOG').remove();
}
function ImportDialogInput(elt) {
    //Convert String to JSON
    try {
        let cfg = JSON.parse(elt.value);
        OverlaySettings_ImportProfile(cfg);
        enableContent();
    } catch (err) {
        console.log(err);
        OUTPUT_showError('Error: Import Settings Corrupted! Try copying again!');
        return;
    }
}
function updateProfilePool(profiles = []) {
    let s = '';
    s += "<div new>Add new Profile</div>";
    s += "<div import>Import Profile</div>";
    for (let profile of profiles) s += '<div title="' + profile + '">' + profile + '</div>';
    document.getElementById('ALERT_OVERLAYS_PROFILES_POOL').innerHTML = s;
}

function createOverlaySetting(preloaded = {}, type = "") {
    document.getElementById('ALERT_OVERLAYS_SETTING_LAYOUT').innerHTML = createOverlaySettingHTML_Layout(preloaded, type);
    document.getElementById('ALERT_OVERLAYS_SETTING_TEXT').innerHTML = createOverlaySettingHTML_Text(preloaded, type);
    document.getElementById('ALERT_OVERLAYS_SETTING_MESSAGE').innerHTML = createOverlaySettingHTML_Message(preloaded, type);
    document.getElementById('ALERT_OVERLAYS_SETTING_IMAGE').innerHTML = createOverlaySettingHTML_Image(preloaded, type);
    document.getElementById('ALERT_OVERLAYS_SETTING_SOUND').innerHTML = createOverlaySettingHTML_Sound(preloaded, type);
    document.getElementById('ALERT_OVERLAYS_SETTING_EXTRAS').innerHTML = createOverlaySettingHTML_Extras(preloaded, type);
    SWITCHBUTTON_AUTOFILL();
    setTimeout(OverlaySettingsWidthCheck, 1000);
}
function createOverlaySettingHTML_Layout(preloaded = {}, type = "") {
    //Settings
    let in_index = 0;
    TRIGGER_EFFECTS.find((elt, idx) => {
        if (elt === (preloaded.move_in || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'move_in').default)) {
            in_index = idx;
            return true;
        }
        return false;
    });
    let out_index = 0;
    TRIGGER_EFFECTS.find((elt, idx) => {
        if (elt === (preloaded.move_out || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'move_out').default)) {
            out_index = idx;
            return true;
        }
        return false;
    });

    let s = '';

    //Layout Wrapper
    s += '<div>';

    //Upper Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_LAYOUT_UPPER_WRAPPER">';
    for (let i = 1; i < 8; i++) {
        s += '<img src="/Alerts/images/layout_' + i + '.png" ' + (preloaded.layout === i || (isNaN(preloaded.layout) && i == DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'layout').default) ? 'selected' : '') + ' data-index="' + i + '" class="ALERT_OVERLAYS_SETTING_LAYOUT_OPTION" onclick="Layout_click(this)"/>';
    }
    s += '</div>';

    //Lower Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_LAYOUT_LOWER_WRAPPER">';

    s += '<div>';
    s += '<div>Move In Effect: ' + MISC_SELECT_create(TRIGGER_EFFECTS, in_index, 'ALERT_OVERLAY_SETTING_LAYOUT_MOVE_IN', 'Layout_Move_Change(this);') + '</div>';
    s += '<div>Move Out Effect: ' + MISC_SELECT_create(TRIGGER_EFFECTS, out_index, 'ALERT_OVERLAY_SETTING_LAYOUT_MOVE_OUT', 'Layout_Move_Change(this);') + '</div>';
    s += '</div>';
    
    s += '</div>';

    s += '</div>';

    return s;
}
function createOverlaySettingHTML_Text(preloaded = {}, type = "") {
    //Settings
    let text_font_index = 0;
    FONTS_LIST.find((elt, idx) => {
        if (elt === (preloaded.text_font || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'text_font').default)) {
            text_font_index = idx;
            return true;
        }
        return false;
    });
    let var_font_index = 0;
    FONTS_LIST.find((elt, idx) => {
        if (elt === (preloaded.var_font || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'vari_font').default)) {
            var_font_index = idx;
            return true;
        }
        return false;
    });

    let s = '';
    
    //Text Wrapper
    s += '<div>';

    //Upper Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_TEXT_UPPER_WRAPPER ALERT_OVERLAYS_SPLIT">';
    //Left
    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE">';
    s += '<div>Text Settings</div>';
    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE_CONTENT">';
    
    s += '<div>';
    s += '<div><div>Font</div> <div>' + MISC_SELECT_create(FONTS_LIST, text_font_index, 'ALERT_OVERLAY_SETTING_TEXT_FONT', 'Text_Input_change();') + '</div></div>';
    let t_s = DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'text_size');
    s += '<div><div>Size</div> <div><input id="ALERT_OVERLAY_SETTING_TEXT_SIZE" type="number" min="' + (t_s.min || 0) + '" max="' + (t_s.max || 100) + '" value="' + (preloaded.text_size || t_s.default) + '" oninput="Text_Input_change();" /><span>%</span></div></div>';
    s += '<div><div>Color</div> <div><input id="ALERT_OVERLAY_SETTING_TEXT_COLOR" type="color" value="' + (preloaded.text_color || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'text_color').default) + '" oninput="Text_Input_change();"/></div></div>';
    s += '<div><div>Bold</div> <div>' + SWITCHBUTTON_CREATE((preloaded.text_bold !== undefined ? preloaded.text_bold : DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'text_bold').default) === true , false, 'Text_Input_change();', 'ALERT_OVERLAY_SETTING_TEXT_BOLD') + '</div></div>';
    s += '</div>';

    s += '<div>';
    s += '<div><div>Shadow</div> <div>' + SWITCHBUTTON_CREATE((preloaded.text_shadow !== undefined ? preloaded.text_shadow : DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'text_shadow').default) === true, false, 'Text_Input_change();', 'ALERT_OVERLAY_SETTING_TEXT_SHADOW') + '</div></div>';
    s += '<div indented><div>Color</div> <div><input id="ALERT_OVERLAY_SETTING_TEXT_SHADOW_COLOR" type="color" value="' + (preloaded.text_shadow_color || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'text_shadow_color').default) + '" oninput="Text_Input_change();" /></div></div>';
    //s += '<div><div>TTS</div> <div>' + SWITCHBUTTON_CREATE((preloaded.text_shadow !== undefined ? preloaded.text_shadow : DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'tts').default) === true, false, 'Text_Input_change();', 'ALERT_OVERLAY_SETTING_TEXT_TTS') + '</div></div>';
    s += '</div>';

    s += '</div>';
    s += '</div>';

    //Right
    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE">';
    s += '<div>Variable Settings</div>';

    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE_CONTENT">';

    s += '<div>';
    s += '<div><div>Font</div> <div>' + MISC_SELECT_create(FONTS_LIST, var_font_index, 'ALERT_OVERLAY_SETTING_VARI_FONT', 'Text_Input_change();') + '</div></div>';
    s += '<div><div>Color</div> <div><input id="ALERT_OVERLAY_SETTING_VARI_COLOR" type="color" value="' + (preloaded.vari_color || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'vari_color').default) + '" oninput="Text_Input_change();"/></div></div>';
    s += '<div><div>Bold</div> <div>' + SWITCHBUTTON_CREATE((preloaded.vari_bold !== undefined ? preloaded.vari_bold : DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'vari_bold').default) === true, false, 'Text_Input_change();', 'ALERT_OVERLAY_SETTING_VARI_BOLD') + '</div></div>';
    s += '<div><div>Shadow</div> <div>' + SWITCHBUTTON_CREATE((preloaded.vari_shadow !== undefined ? preloaded.vari_shadow : DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'vari_shadow').default) === true, false, 'Text_Input_change();', 'ALERT_OVERLAY_SETTING_VARI_SHADOW') + '</div></div>';
    s += '<div indented><div>Color</div> <div><input id="ALERT_OVERLAY_SETTING_VARI_SHADOW_COLOR" type="color" value="' + (preloaded.vari_shadow_color || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'vari_shadow_color').default) + '" oninput="Text_Input_change();" /></div></div>';
    s += '</div>';

    s += '</div>';

    s += '</div>';
    
    s += '</div>';

    //Middle Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_TEXT_MIDDLE_WRAPPER">';
    if (type) {
        s += '<div>Available Text Variables</div>';
        s += '<div>';
        for (let vari of ALERT_VARIABLES[type.toLocaleLowerCase()]) s += '<div title="' + vari.desc + ' (' + vari.type + ')">{' + vari.name + '}</div>';
        s += '</div>';
    }
    s += '</div>';

    //Lower Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_TEXT_LOWER_WRAPPER">';
    s += '</div>';

    s += '</div>';

    return s;
}
function createOverlaySettingHTML_Message(preloaded = {}, type = "") {
    //Settings
    let message_font_index = 0;
    FONTS_LIST.find((elt, idx) => {
        if (elt === (preloaded.message_font || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'message_font').default)) {
            message_font_index = idx;
            return true;
        }
        return false;
    });

    let s = '';

    //Text Wrapper
    s += '<div>';

    //Upper Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_MESSAGE_UPPER_WRAPPER ALERT_OVERLAYS_SPLIT">';
    //Left
    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE">';
    s += '<div>Layout</div>';
    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE_CONTENT">';

    s += '<div>';
    for (let i = 1; i < 3; i++) {
        s += '<img src="/Alerts/images/message_layout_' + i + '.png" ' + (preloaded.message_layout === i ? 'selected' : '') + ' data-index="' + i + '" class="ALERT_OVERLAYS_SETTING_MESSAGE_LAYOUT_OPTION" onclick="Message_Layout_click(this)"/>';
    }
    s += '</div>';
    
    s += '</div>';
    s += '</div>';

    //Right
    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE">';
    s += '<div>Message Settings</div>';

    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE_CONTENT">';

    s += '<div>';
    s += '<div><div>Font</div> <div>' + MISC_SELECT_create(FONTS_LIST, message_font_index, 'ALERT_OVERLAY_SETTING_MESSAGE_FONT', 'Message_Input_change();') + '</div></div>';
    let m_s = DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'message_size');
    s += '<div><div>Size</div> <div><input id="ALERT_OVERLAY_SETTING_MESSAGE_SIZE" type="number" min="' + (m_s.min || 0) + '" max="' + (m_s.max || 100) + '" value="' + (preloaded.message_size || m_s.default) + '" oninput="Message_Input_change();" /><span>%</span></div></div>';
    s += '<div><div>Color</div> <div><input id="ALERT_OVERLAY_SETTING_MESSAGE_COLOR" type="color" value="' + (preloaded.message_color || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'message_color').default) + '" oninput="Message_Input_change();"/></div></div>';
    s += '<div><div>Bold</div> <div>' + SWITCHBUTTON_CREATE((preloaded.message_bold !== undefined ? preloaded.message_bold : DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'message_bold').default) === true, false, 'Message_Input_change();', 'ALERT_OVERLAY_SETTING_MESSAGE_BOLD') + '</div></div>';
    s += '</div>';
    
    s += '<div>';
    s += '<div><div>Shadow</div> <div>' + SWITCHBUTTON_CREATE((preloaded.message_shadow !== undefined ? preloaded.message_shadow : DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'message_shadow').default) === true, false, 'Message_Input_change();', 'ALERT_OVERLAY_SETTING_MESSAGE_SHADOW') + '</div></div>';
    s += '<div indented><div>Color</div> <div><input id="ALERT_OVERLAY_SETTING_MESSAGE_SHADOW_COLOR" type="color" value="' + (preloaded.message_shadow_color || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'message_shadow_color').default) + '" oninput="Message_Input_change();" /></div></div>';
    s += '<div><div>Show Emotes</div> <div>' + SWITCHBUTTON_CREATE((preloaded.message_show_emotes !== undefined ? preloaded.message_show_emotes : DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'message_show_emotes').default) === true, false, 'Message_Input_change();', 'ALERT_OVERLAY_SETTING_MESSAGE_SHOW_EMOTES') + '</div></div>';
    //s += '<div><div>TTS</div> <div>' + SWITCHBUTTON_CREATE((preloaded.message_tts !== undefined ? preloaded.message_tts : DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'message_tts').default) === true, false, 'Message_Input_change();', 'ALERT_OVERLAY_SETTING_MESSAGE_TTS') + '</div></div>';
    s += '</div>';
    
    s += '</div>';

    s += '</div>';

    s += '</div>';
    
    //Lower Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_MESSAGE_LOWER_WRAPPER">';
    s += '</div>';
    s += '</div>';

    return s;
}
function createOverlaySettingHTML_Image(preloaded = {}, type = "") {
    let s = '';

    //Layout Wrapper
    s += '<div>';

    //Upper Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_IMAGE_UPPER_WRAPPER">';
    s += MISC_createFileLibrary(FILES, '/Alerts/Custom/', 'All Image/Video Files', 'images', preloaded.image, null, 'id="ALERT_OVERLAY_SETTING_IMAGE"', '/api/Alerts/files', 'Image_change');
    s += '</div>';

    //Lower Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_IMAGE_LOWER_WRAPPER">';

    s += '<div>';
    let v = DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'video_volume');
    s += '<div>Volume: <input id="ALERT_OVERLAY_SETTING_VIDEO_VOLUME" type="range" min="' + (v.min || 0) + '" value="' + (preloaded.video_volume || v.default) + '" max="' + (v.max || 100) + '" oninput="Image_Slider_Change(this)" /> <input type="number" min="' + (v.min || 0) + '" value="' + (preloaded.video_volume || v.default) + '" max="' + (v.max || 100) + '" oninput="Image_Input_Change(this)" /></div>';
    s += '</div>';
    
    s += '</div>';

    s += '</div>';

    return s;
}
function createOverlaySettingHTML_Sound(preloaded = {}, type = "") {
    let s = '';

    //Layout Wrapper
    s += '<div>';

    //Upper Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_SOUND_UPPER_WRAPPER">';
    s += MISC_createFileLibrary(FILES, '/Alerts/Custom/', 'All Sound/Music Files', 'sounds', preloaded.sound, null, 'id="ALERT_OVERLAY_SETTING_SOUND"', '/api/Alerts/files', 'Sound_change');
    s += '</div>';

    //Lower Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_SOUND_LOWER_WRAPPER">';

    s += '<div>';
    let v = DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'sound_volume');
    s += '<div>Volume: <input id="ALERT_OVERLAY_SETTING_SOUND_VOLUME" type="range" min="' + (v.min || 0) + '" value="' + (preloaded.sound_volume || v.default) + '" max="' + (v.max || 100) + '" oninput="Sound_Slider_Change(this)" /> <input type="number" min="' + (v.min || 0) + '" value="' + (preloaded.sound_volume || v.default) + '" max="' + (v.max || 100) + '" oninput="Sound_Input_Change(this)" /></div>';
    s += '</div>';
    
    s += '</div>';

    s += '</div>';

    return s;
}
function createOverlaySettingHTML_Extras(preloaded = {}, type = "") {
    let s = '';

    //Layout Wrapper
    s += '<div>';

    //Upper Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_EXTRAS_UPPER_WRAPPER ALERT_OVERLAYS_SPLIT">';
    //Left
    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE">';
    s += '<div style="width: 0; height: 0;"></div>';
    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE_CONTENT">';

    s += '<div>';
    s += '<div>Custom CSS</div>';
    s += '<textarea id="ALERT_OVERLAY_SETTING_CSS" oninput="Extras_Input_change();">' + (preloaded.css || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'css').default) + '</textarea>';
    s += '</div>';

    s += '<div>';
    s += '<div>Custom Javascript</div>';
    s += '<textarea id="ALERT_OVERLAY_SETTING_JS" oninput="Extras_Input_change();">' + (preloaded.js || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'js').default) + '</textarea>';
    s += '</div>';

    s += '</div>';
    s += '</div>';

    //Right
    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE">';
    s += '<div>Settings</div>';

    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE_CONTENT">';

    s += '<div>';
    s += '<div><div>Delay</div> <div><span><input id="ALERT_OVERLAY_SETTING_DELAY" type="number" value="' + (preloaded.delay || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'delay').default) + '" oninput="Extras_Input_change();" min="0" />s</span></div></div>';
    s += '<div><div>On Time</div> <div><span><input id="ALERT_OVERLAY_SETTING_ON_TIME" type="number" value="' + (preloaded.on_time || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'on_time').default) + '" oninput="Extras_Input_change();" min="0" />s</span></div></div>';
    s += '</div>';
    
    s += '</div>';

    s += '</div>';

    s += '</div>';

    //Lower Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_EXTRAS_LOWER_WRAPPER">';
    s += '</div>';

    s += '</div>';

    return s;
}

function OverlaySettingSwitchHeader(e) {
    let target = e.target;
    if (target.tagName !== 'DIV') target = target.parentElement;
    OverlaySettingSwitchTab(target.dataset.name);
    OverlaySettingsWidthCheck();
}
function OverlaySettingSwitchTab(header_letter = "l") {
    let elt;

    for (let child of document.getElementById('ALERT_OVERLAYS_SETTINGS').childNodes) if (child instanceof Element) child.style.display = 'none';
    for (let child of document.getElementById('ALERT_OVERLAYS_HEADER').childNodes) {
        if (child instanceof Element && child.dataset.name !== header_letter) child.removeAttribute('highlighted');
        else if (child instanceof Element) child.setAttribute('highlighted', 'true');
    }

    switch (header_letter) {
        case 'l': elt = document.getElementById('ALERT_OVERLAYS_SETTING_LAYOUT'); break;
        case 't': elt = document.getElementById('ALERT_OVERLAYS_SETTING_TEXT'); break;
        case 'm': elt = document.getElementById('ALERT_OVERLAYS_SETTING_MESSAGE'); break;
        case 'i': elt = document.getElementById('ALERT_OVERLAYS_SETTING_IMAGE'); break;
        case 's': elt = document.getElementById('ALERT_OVERLAYS_SETTING_SOUND'); break;
        case 'e': elt = document.getElementById('ALERT_OVERLAYS_SETTING_EXTRAS'); break;
    }

    if (elt) elt.style.display = 'block';
}
let update_allready_in_progress = false;
function OverlaySettingsWidthCheck(once = true) {
    if (update_allready_in_progress) return;
    update_allready_in_progress = true;
    
    const elts = ['ALERT_OVERLAYS_SETTING_TEXT', 'ALERT_OVERLAYS_SETTING_MESSAGE'];
    for (let elem of elts) {
        let elt = document.getElementById(elem);

        if (elt.clientWidth < 700) elt.classList.add('snug');
        else elt.classList.remove('snug');

        if (elt.clientWidth < 630) elt.classList.add('snuggest');
        else elt.classList.remove('snuggest');
    }
    
    MISC_SELECT_WidthCheck_All();

    setTimeout(() => {
        update_allready_in_progress = false;
        if (once) OverlaySettingsWidthCheck(false);
    }, 100);
}

function OverlaySettings_SaveProfile() {
    let name_input = document.getElementById('ALERT_OVERLAYS_PROFILES_SELECT').childNodes[1].childNodes[0];
    
    let cfg = OverlaySettings_collectJSON(alert);
    OverlaySettings_SetSaveState(false);

    //Check Errors
    let error = OverlaySettings_checkJSON(cfg);
    if (error !== true) {
        OUTPUT_showError('Error: ' + error);
        return;
    }

    let opts = getAuthHeader();

    if (document.getElementById('ALERT_OVERLAY_SAVE_BUTTON').dataset.new === 'true') {
        opts.method = 'POST';
        opts.body = JSON.stringify({ name: name_input.value, cfg });
    } else {
        opts.method = 'PUT';

        if (name_input.dataset.default === name_input.value) opts.body = JSON.stringify({ name: name_input.dataset.default, cfg });
        else opts.body = JSON.stringify({ name: name_input.dataset.default, cfg, rename: name_input.value });
    }
    
    opts.headers['Content-Type'] = 'application/json';
    
    //Save
    fetch('/api/alerts/profiles', opts)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            if (json.err) return Promise.reject(new Error(json.err));
            OUTPUT_showInfo('Profile Changed!');
            
            PROFILES[Object.getOwnPropertyNames(json)[0]] = json[Object.getOwnPropertyNames(json)[0]];
            if (name_input.dataset.default !== name_input.value) delete PROFILES[name_input.dataset.default];

            updateProfilePool(Object.getOwnPropertyNames(PROFILES));
            updateAlertsPools();
            document.getElementById('ALERT_OVERLAY_SAVE_BUTTON').dataset.new = 'false';
        })
        .catch(err => {
            OverlaySettings_SetSaveState(true);
            console.log(err);
            OUTPUT_showError(err.message);
        });
}
async function OverlaySettings_RemoveProfile(profile_name) {
    if (!profile_name) profile_name = document.getElementById('ALERT_OVERLAYS_PROFILES_SELECT').childNodes[1].childNodes[0].value;
    if (!profile_name) return;

    //Stop Default
    if (profile_name === 'default') {
        OUTPUT_showError('Default Profile cant be deleted!');
        return;
    }

    //Await Confirmation
    let answer = 'NO';

    try {
        let uses = [];
        for (let alert in ALERTS) {
            if (ALERTS[alert].profiles.find(elt => elt.name === profile_name)) uses.push(alert);
        }

        answer = await MISC_USERCONFIRM("YOU SURE YOU WANT THIS?", "Do you really want to delete this Profile? It is currently " + (uses.length === 0 ? 'UNUSED' : 'by these Alerts: ' + uses.join(', ') + '!'));
    } catch (err) {

    }

    if (answer !== 'YES') return Promise.resolve();
    
    let opts = getAuthHeader();
    opts.method = 'DELETE';
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify({ name: profile_name });

    //Save
    fetch('/api/alerts/profiles', opts)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            OUTPUT_showInfo('Profile Removed!');
            if (PROFILES[profile_name]) delete PROFILES[profile_name];
            document.getElementById('ALERT_OVERLAYS_PROFILES_SELECT').childNodes[1].innerHTML = 'Select Profile';
            document.getElementById('ALERT_OVERLAYS_WRAPPER').style.display = 'none';
            updateProfilePool(Object.getOwnPropertyNames(PROFILES));
            updateAlertsPools();
        })
        .catch(err => {
            console.log(err);
            OUTPUT_showError(err.message);
        });
}
async function OverlaySettings_DuplicateProfile(profile_name) {
    //Await Confirmation
    let answer = document.getElementById('ALERT_OVERLAY_SAVE_BUTTON').hasAttribute('disabled') ? 'IGNORE' : 'CANCEL';

    try {
        if (answer !== 'IGNORE') answer = await MISC_USERCONFIRM("YOU SURE YOU WANT THIS?", "Duplicating this Profile now will reset all unsaved Changes! Be sure to save, if you want to keep these changes!", ['IGNORE', 'CANCEL']);
    } catch (err) {

    }

    if (answer !== 'IGNORE') return Promise.resolve();
    
    let name_input = document.getElementById('ALERT_OVERLAYS_PROFILES_SELECT').childNodes[1].childNodes[0];
    
    if (!profile_name) profile_name = name_input.dataset.default;
    if (!profile_name) return;
    
    let cfg = OverlaySettings_collectJSON(alert);
    newProfile(cfg, profile_name);
}
async function OverlaySettings_ExportProfile() {
    let cfg = OverlaySettings_collectJSON();

    //Check Errors
    let error = OverlaySettings_checkJSON(cfg);
    if (error !== true) {
        OUTPUT_showError('Error: ' + error);
        return;
    }

    OUTPUT_showInfo('Copied Profile Settings to Clipboard!');
    copyToClipboard(JSON.stringify(cfg));
}

function OverlaySettings_collectJSON() {
    //Layout
    let layout = 1;
    for (let elt of document.getElementsByClassName('ALERT_OVERLAYS_SETTING_LAYOUT_OPTION')) {
        if (elt instanceof Element && elt.hasAttribute('selected')) layout = parseInt(elt.dataset.index);
    }
    let move_in = MISC_SELECT_GetValue(document.getElementById('ALERT_OVERLAY_SETTING_LAYOUT_MOVE_IN'));
    let move_out = MISC_SELECT_GetValue(document.getElementById('ALERT_OVERLAY_SETTING_LAYOUT_MOVE_OUT'));

    //Text
    let text_font = MISC_SELECT_GetValue(document.getElementById('ALERT_OVERLAY_SETTING_TEXT_FONT'));
    let text_size = parseInt(document.getElementById('ALERT_OVERLAY_SETTING_TEXT_SIZE').value);
    let text_color = document.getElementById('ALERT_OVERLAY_SETTING_TEXT_COLOR').value;
    let text_bold = document.getElementById('ALERT_OVERLAY_SETTING_TEXT_BOLD').value;
    let text_shadow = document.getElementById('ALERT_OVERLAY_SETTING_TEXT_SHADOW').value;
    let text_shadow_color = document.getElementById('ALERT_OVERLAY_SETTING_TEXT_SHADOW_COLOR').value;
    //let text_tts = document.getElementById('ALERT_OVERLAY_SETTING_TEXT_TTS').value;

    let vari_font = MISC_SELECT_GetValue(document.getElementById('ALERT_OVERLAY_SETTING_VARI_FONT'));
    let vari_color = document.getElementById('ALERT_OVERLAY_SETTING_VARI_COLOR').value;
    let vari_bold = document.getElementById('ALERT_OVERLAY_SETTING_VARI_BOLD').value;
    let vari_shadow = document.getElementById('ALERT_OVERLAY_SETTING_VARI_SHADOW').value;
    let vari_shadow_color = document.getElementById('ALERT_OVERLAY_SETTING_VARI_SHADOW_COLOR').value;
    
    //Message
    let message_layout = 1;
    for (let elt of document.getElementsByClassName('ALERT_OVERLAYS_SETTING_MESSAGE_LAYOUT_OPTION')) {
        if (elt instanceof Element && elt.hasAttribute('selected')) message_layout = parseInt(elt.dataset.index);
    }
    let message_font = MISC_SELECT_GetValue(document.getElementById('ALERT_OVERLAY_SETTING_MESSAGE_FONT'));
    let message_size = parseInt(document.getElementById('ALERT_OVERLAY_SETTING_MESSAGE_SIZE').value);
    let message_color = document.getElementById('ALERT_OVERLAY_SETTING_MESSAGE_COLOR').value;
    let message_bold = document.getElementById('ALERT_OVERLAY_SETTING_MESSAGE_BOLD').value;
    let message_shadow = document.getElementById('ALERT_OVERLAY_SETTING_MESSAGE_SHADOW').value;
    let message_shadow_color = document.getElementById('ALERT_OVERLAY_SETTING_MESSAGE_SHADOW_COLOR').value;
    let message_show_emotes = document.getElementById('ALERT_OVERLAY_SETTING_MESSAGE_SHOW_EMOTES').value;
    //let message_tts = document.getElementById('ALERT_OVERLAY_SETTING_MESSAGE_TTS').value;

    //Sound
    let sound = MISC_FileLibrary_getSelectedFile(document.getElementById('ALERT_OVERLAY_SETTING_SOUND')) || '';
    let sound_volume = parseInt(document.getElementById('ALERT_OVERLAY_SETTING_SOUND_VOLUME').value);

    //Sound
    let image = MISC_FileLibrary_getSelectedFile(document.getElementById('ALERT_OVERLAY_SETTING_IMAGE')) || '';
    let video_volume = parseInt(document.getElementById('ALERT_OVERLAY_SETTING_VIDEO_VOLUME').value);

    //Extras
    let delay = parseInt(document.getElementById('ALERT_OVERLAY_SETTING_DELAY').value);
    let on_time = parseInt(document.getElementById('ALERT_OVERLAY_SETTING_ON_TIME').value);
    let css = document.getElementById('ALERT_OVERLAY_SETTING_CSS').value;
    let js = document.getElementById('ALERT_OVERLAY_SETTING_JS').value;

    return {
        delay, on_time, css, js,
        sound, sound_volume,
        image, video_volume,
        message_font, message_layout, message_size, message_color, message_bold, message_shadow, message_shadow_color, message_show_emotes,
        text_font, text_size, text_color, text_bold, text_shadow, text_shadow_color,
        vari_font, vari_color, vari_bold, vari_shadow, vari_shadow_color,
        layout, move_in, move_out
    };
}
function OverlaySettings_checkJSON(cfg) {
    if (cfg.layout < 6 && cfg.image === "") return 'Image missing!';
    if (cfg.layout !== 5 && cfg.layout !== 7 && cfg.text === "") return 'Text missing!';
    return true;
}

function OverlaySettings_SetSaveState(state = false) {
    let elt = document.getElementById('ALERT_OVERLAY_SAVE_BUTTON');
    if (state) elt.removeAttribute('disabled');
    else elt.setAttribute('disabled', 'true');
}
function OverlaySettings_expandPreview(elt) {
    if (document.getElementById('ALERT_OVERLAYS_PREVIEW_WRAPPER').classList.contains('show')) {
        elt.innerHTML = 'PREVIEW ALERT SETTINGS';
        document.getElementById('ALERT_OVERLAYS_PREVIEW_WRAPPER').classList.toggle('show')
        document.getElementById('ALERT_OVERLAYS_PREVIEW').classList.toggle('expand');
        Alert_cancel('TEST_OVERLAY_PREVIEW');
    } else {
        elt.innerHTML = 'HIDE ALERT PREVIEW';
        document.getElementById('ALERT_OVERLAYS_PREVIEW_WRAPPER').classList.toggle('show')
        document.getElementById('ALERT_OVERLAYS_PREVIEW').classList.toggle('expand');
        OverlaySettings_updatePreview();
    }
}
function OverlaySettings_updatePreview() {
    if (!document.getElementById('ALERT_OVERLAYS_PREVIEW_WRAPPER').classList.contains('show')) return;

    //Collect Setting Data
    let cfg = OverlaySettings_collectJSON();

    //Check Errors or Cfg
    let error = OverlaySettings_checkJSON(cfg);
    if (error !== true) {
        OUTPUT_showError('Error: ' + error);
        return;
    }

    //TEXT TEMPLATE
    cfg.text = "{username} just resubscribed for {months} Months!";
    cfg.text_size /= 2;
    cfg.message_size /= 2;
    
    //Create Alert
    document.getElementById('ALERT_OVERLAYS_PREVIEW').innerHTML = Alert_Overlay_createHTML(cfg, TEXT_ALERT_EVENT, 'TEST_OVERLAY_PREVIEW', true);
    Alert_Overlay_trigger('TEST_OVERLAY_PREVIEW', cfg, OverlaySettings_updatePreview);
}

function Layout_click(elt) {
    if (elt.hasAttribute('selected')) return;
    
    for (let elt of document.getElementsByClassName('ALERT_OVERLAYS_SETTING_LAYOUT_OPTION')) elt.removeAttribute('selected');
    elt.setAttribute('selected', 'true');
    OverlaySettings_SetSaveState(true);
}
function Layout_Move_Change() {
    OverlaySettings_SetSaveState(true);
}

function Text_Input_change() {
    OverlaySettings_SetSaveState(true);
}

function Message_Input_change() {
    OverlaySettings_SetSaveState(true);
}
function Message_Layout_click(elt) {
    if (elt.hasAttribute('selected')) return;

    for (let elt of document.getElementsByClassName('ALERT_OVERLAYS_SETTING_MESSAGE_LAYOUT_OPTION')) elt.removeAttribute('selected');
    elt.setAttribute('selected', 'true');
    OverlaySettings_SetSaveState(true);
}

function Image_change(value) {
    OverlaySettings_SetSaveState(true);
}
function Image_Slider_Change(elt) {
    for (let child of elt.parentElement.childNodes) {
        if (child instanceof Element && child.type == 'number') {
            child.value = elt.value;
        }
    }
    OverlaySettings_SetSaveState(true);
}
function Image_Input_Change(elt) {
    for (let child of elt.parentElement.childNodes) {
        if (child instanceof Element && child.type == 'range') {
            child.value = elt.value;
        }
    }
    OverlaySettings_SetSaveState(true);
}

function Sound_change(value) {
    OverlaySettings_SetSaveState(true);
}
function Sound_Slider_Change(elt) {
    for (let child of elt.parentElement.childNodes) {
        if (child instanceof Element && child.type == 'number') {
            child.value = elt.value;
        }
    }
    OverlaySettings_SetSaveState(true);
}
function Sound_Input_Change(elt) {
    for (let child of elt.parentElement.childNodes) {
        if (child instanceof Element && child.type == 'range') {
            child.value = elt.value;
        }
    }
    OverlaySettings_SetSaveState(true);
}

function Extras_Input_change() {
    OverlaySettings_SetSaveState(true);
}

/* TTS */
async function GetVoices() {
    let voices = [];

    return new Promise((resolve, reject) => {
        let inter = setInterval(() => {
            voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                clearInterval(inter);
                return resolve(voices);
            }
        }, 100);
    });
}
function updateVoicePitch(value = 0) {
    document.getElementById('TTS_Pitch_Slider').value = parseFloat(value).toFixed(2);
    document.getElementById('TTS_Pitch_Input').value = Math_map(parseFloat(value), 0, 2, -1, 1).toFixed(2);
}
function previewVoice() {
    let pitch = document.getElementById('TTS_Pitch_Slider').value;
    let voice = MISC_SELECT_GetValue(document.getElementById('TTS_VOICE_SELECT').childNodes[0]);
    let text = document.getElementById('TTS_VOICE_TEXT').value;
    let volume = document.getElementById('TTS_Volume').value;

    text2speech(text, volume, pitch, VOICES.find(elt => elt.name === voice));
}