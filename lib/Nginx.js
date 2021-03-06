const _ = require('lodash');
const fs = require('fs-extra');
const shell = require('shelljs');
const path = require('path');
const { render, templatePath } = require('./template');

const { EXEC_SUDO, NGINX_INCLUDES, NGINX_SITES_AVAILABLE, NGINX_SITES_ENABLED } = process.env;
const sudo = EXEC_SUDO ? 'sudo ' : '';

class Nginx {
    constructor(options) {
        this.logger = options.logger;
    }

    includeAdd(templateName, options) {
        const templateFile = templatePath(templateName);
        const includePath = path.join(NGINX_INCLUDES, templateName);
        const template = fs.readFileSync(templateFile, 'utf8');
        const context = _.assign({}, options);
        fs.writeFileSync(includePath, render(template, context));
        this.logger(`nginx include ${templateName} config written to ${includePath}`);
        return fs.existsSync(includePath);
    }

    includeRemove(templateName) {
        const includePath = path.join(NGINX_INCLUDES, templateName);
        fs.removeSync(includePath);
        this.logger(`nginx include ${templateName} config removed`);
        return !fs.existsSync(includePath);
    }

    vhostAdd(hostname, templateName, options) {
        const templateFile = templatePath(`${templateName}.conf`);
        const vhostConfigPath = path.join(NGINX_SITES_AVAILABLE, hostname);
        const template = fs.readFileSync(templateFile, 'utf8');
        const context = _.assign({}, options, { hostname });
        fs.writeFileSync(vhostConfigPath, render(template, context));
        this.logger(`nginx vhost ${hostname} config written to ${vhostConfigPath}`);
        return fs.existsSync(vhostConfigPath);
    }

    vhostRemove(hostname) {
        this.vhostDisable(hostname);
        const vhostConfigPath = path.join(NGINX_SITES_AVAILABLE, hostname);
        fs.removeSync(vhostConfigPath);
        this.logger(`nginx vhost ${hostname} config removed`);
        return !fs.existsSync(vhostConfigPath);
    }

    vhostEnable(hostname) {
        const vhostConfigPath = path.join(NGINX_SITES_AVAILABLE, hostname);
        const symlinkPath = path.join(NGINX_SITES_ENABLED, hostname);
        fs.ensureSymlinkSync(vhostConfigPath, symlinkPath);
        this.logger(`nginx vhost ${hostname} enabled ${symlinkPath}`);
        return fs.existsSync(symlinkPath);
    }

    vhostDisable(hostname) {
        const symlinkPath = path.join(NGINX_SITES_ENABLED, hostname);
        fs.removeSync(symlinkPath);
        this.logger(`nginx vhost ${hostname} disabled ${symlinkPath}`);
        return !fs.existsSync(symlinkPath);
    }

    test() {
        const { code, stderr } = shell.exec(`${sudo}nginx -t`, { silent: true });
        if (code) throw new Error(stderr);
        this.logger(`nginx test: ${code ? 'fail' : 'ok'}`);
        return !code;
    }

    reload() {
        const code = shell.exec(`${sudo}service nginx reload`, { silent: true }).code;
        this.logger(`nginx reload: ${code ? 'fail' : 'ok'}`);
        return !code;
    }
}

module.exports = Nginx;
