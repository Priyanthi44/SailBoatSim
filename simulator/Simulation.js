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

'use strict';

var Environment = require('./Environment');
var wrc = require('web-remote-control');

const DEFAULT_SPEED = 100;

/**
 * Create a simulation.
 * @param {Number} dt   Time between steps, in milliseconds.
 * @param {Boolean} realtime   In real-time mode (realtime=true) we wait `dt` milliseconds before running next simulation step.  Otherwise don't wait to run next simualtion step.
 */
function Simulation(dt, realtime, options) {
    dt = dt || DEFAULT_SPEED;
    var simSpeed = 1;

    realtime = (typeof realtime === 'undefined') ? realtime : true;
    if (realtime) {
        var self = this;
        this.callNextStep = function (callback) {
            var delay;
            if (simSpeed <= 0) {
                delay = 1;
            } else {
                delay = dt / simSpeed;
            }
            self.stepTimeout = setTimeout(self.step.bind(self, callback), delay);
        };
    } else {
        this.callNextStep = this.step;
    }

    this.time = {
        delta: dt,                 // The change in time (ms)
        deltaSec: dt / 1000,       // The change in time (seconds)
        now: new Date().getTime()  // The current time
    };
    this.environment = new Environment(options);
    this.players = [];


    //
    // This is how we control our simulation speed
    //
    var simSpeedToy = wrc.createToy({
        channel: 'simulation-speed'
    });
    simSpeedToy.on('command', function(cmd) {
        if (typeof cmd.setSpeed === 'number') {
            simSpeed = cmd.setSpeed;
        }
    });
    simSpeedToy.on('error', console.error);

}

Simulation.prototype.addPlayer = function(player) {
    // FIXME: Need to validate player
    this.players.push(player);
};

Simulation.prototype.step = function(callback) {
    var env = this.environment.update(this.time);
    this.players.forEach((player) => {
        player.boat.simulate(this.time, env);
        player.runAI(this.time.delta, env, true);
    });
    this.time.now += this.time.delta;
    callback(this.players, env);
    this.callNextStep(callback);
};

Simulation.prototype.getPlayers = function() {
    return this.players;
};

Simulation.prototype.run = function(callback) {
    callback = typeof callback === 'function' ? callback : function () {};
    this.step(callback);
};

Simulation.prototype.reset = function(contest, request) {
    this.environment = new Environment(request);
    // FIXME: This only works for one player
    this.players.forEach((player) => { player.restart(contest, request); });
};


module.exports = Simulation;
