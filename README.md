# Alers Package 
This Repository is a Package for the FrikyBot.

The Alerts Package is a classic Overlay based Alert System for Twitch Chat and API Events. Also providing an Alert History and a deeply customizeable Profile System - it might be the most advanced Alerts System ever (well maybe not yet ;P)

Note: This is Code cant be run on its own, its still tied to the FrikyBot Interface and Ecosystem!

## Getting Started
This Package is powered by Node.js and some NPM Modules.

All dependancies are:
* [express](https://www.npmjs.com/package/express) - providing File and API Routing Capabilities
* [nedb](https://www.npmjs.com/package/nedb) - Database Manager (to be replaced with MongoDB "soon")

Installing a Package is very easy! Clone this Package to your local machine, wrap it in Folder Named "Alerts" and drop that into your FrikyBot Packages Folder.
Now use the FrikyBot WebInterface and add the Package on the Settings->Packages Page.

## Features

### Alert Overlays
Alert Overlays are triggered on Sub, Follows, Raids, Host and many more. Overlay Designs are configured by Alert Profiles. These Profiles can also be asigned trigger options to further customize the overlay design based on e.g. Sub-Streak, Tier or the amount Bits/viewers.

### Alert Profiles
Alert Profiles are customizeable Overlay designs that provide many common but also many unique options to make your Overlays your own!

### Alert History
Tracking missed Alerts and the ability to retrigger them at any time.

### Event History
HypeTrains and Goals can come and go very fast - having these Events tracked provides streamers an overview of them.

## Planned Features
* **Profile Groups** - Save multiple Alert Profile Settings in one Group, share them and switch easily between them.
* **Event Overlays** - Overlay Designs for HypeTrains, Goals, Predictions, Polls and ChannelPoint Redemptions.
* **Event/Alert History Overlays** - Overlay Designs to display the latest Alert/Event (e.g. Sub, Raid, ...)

## Updates
Follow the official [Twitter](https://twitter.com/FrikyBot) Account or take a look at the [FrikyBot News](https://frikybot.de/News) to see upcomming Features and Updates.

## Authors
* **Tim Klenk** - [FrikyMediaLP](https://github.com/FrikyMediaLP)
