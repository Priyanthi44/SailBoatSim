/*********************************************************************
 *                                                                   *
 *   Copyright 2016 Simon M. Werner                                  *
 *                                                                   *
 *   Licensed to the Apache Software Foundation (ASF) under one      *
 *   or more contributor license agreements.  See the NOTICE file    *
 *   distributed with this work for additional information           *
 *   regarding copyright ownership.  The ASF licenses this file      *
 *   to you under the Apache License, Version 2.0 (the               *
 *   "License"); you may not use this file except in compliance      *
 *   with the License.  You may obtain a copy of the License at      *
 *                                                                   *
 *      http://www.apache.org/licenses/LICENSE-2.0                   *
 *                                                                   *
 *   Unless required by applicable law or agreed to in writing,      *
 *   software distributed under the License is distributed on an     *
 *   "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY          *
 *   KIND, either express or implied.  See the License for the       *
 *   specific language governing permissions and limitations         *
 *   under the License.                                              *
 *                                                                   *
 *********************************************************************/

/**
 * This example AI algorithm is the same as the one provided by in the paper by Jon Melin:
 *     https://uu.diva-portal.org/smash/get/diva2:850625/FULLTEXT01.pdf
 */

'use strict';

var util = require('sailboat-utils/util');
var Position = require('sailboat-utils/Position');
var WaypointManager = require('sailboat-utils/WaypointManager');

var PLAYER_NAME = 'Simulation';

//
// Set up the toy (a.k.a boat) be controlled by the controller (can be a mobile phone or some remote AI).
//
var wrc = require('web-remote-control');
var toy = wrc.createToy({
    proxyUrl: 'localhost',
    udp4: false,
    tcp: true,
    socketio: false,
    channel: PLAYER_NAME,
    log: function() {}
});
toy.on('error', console.error);

// Can be 'nominal' or 'tack';
var mode = 'tack';

// Tacking mode -1 or 1
var q = 1;

const pi = Math.PI;

// gamma > 0 is a tuning parameter, i.e. a larger value for gamma gives a
// trajectory of the boat that converges faster to the desired line. [MELIN]
const gamma = 180 / 4;

// Tacking angle - TODO: Needs to be optimised
const thetaT = 45;

// The no-go zone.  See: https://en.wikipedia.org/wiki/Point_of_sail TODO: Needs to be optimised
const thetaNoGo = 30;

var JM = {
    info: {
        name: 'Jon.Melin',
    },
    /**
     * This will be run once before the simulational initalises.
     * See this link for the contest details: https://github.com/psiphi75/SailBoatSim/blob/master/AI.md#contests
     */
    init: function(contest) {
        this.contest = contest;
        this.waypoints = new WaypointManager(contest.waypoints);
    },
    /**
     * This function is called every step.  See the AI.md file for documentation.
     * @param  {object} state
     * @return {object} The result is the new value of the rudder.
     */
    ai: function (state) {

        state.isSimulation = true;
        toy.status(state);

        // TODO: This needs all some testing

        var myPosition = new Position(state.boat.gps);
        var wpStatus = this.waypoints.getStatus(myPosition);

        // 1. Check if we have reached the waypoint, if yes, then load the next waypoint.
        if (wpStatus.achieved) {
            wpStatus = this.waypoints.next(myPosition);
        }

        // 2. Calculate the desired heading, thetaR.
        var wpCurrent = this.waypoints.getCurrent();
        var wpPrev = this.waypoints.getPrevious();
        var l = myPosition.distanceToLine(wpCurrent, wpPrev);       // Distance to the desired trajectory
        var r = wpStatus.radius;
        var beta = wpPrev.distanceHeadingTo(wpCurrent).heading;     // Desired trajectory, the angle from the last waypoint to the next
        var thetaR = beta - 2 * gamma / pi * Math.atan(l / r);
        var theta = state.boat.attitude.heading;

        // 3. Determine mode of sailing, nominal or tack.
        var trueWind = state.environment.wind;
        var trueWindHeading = util.wrapDegrees(trueWind.heading + 180);

        if (mode !== 'nominal') {
            // d, determines how close the sailboat will keep to the desired trajectory during tacking
            // TODO: This is a strategical value, this can be optimised based on water drift, etc.
            var d = wpStatus.radius * 2;
            var distantToWaypointLine = myPosition.distanceToLine(wpCurrent, wpPrev);

            if (distantToWaypointLine >= d) {
                q = myPosition.calcSideOfLine(wpCurrent, wpPrev);
            }
            // FIXME: thetaR is already calculated above, we should only have to calculate once
            thetaR = trueWindHeading + q * thetaT;
        }

        // 4. Calculate rudder angle.
        var e = theta - thetaR;
        var sigmaRMax = 1;
        var rudder = Math.sin(util.toDegrees(e)) * sigmaRMax;

        // 5. Calculate sail angle - Not currently implemented

        return {
            action: 'move',
            servoRudder: rudder,
            servoSail: 0
        };
    },
    close: function() {
    }
};

module.exports = JM;
