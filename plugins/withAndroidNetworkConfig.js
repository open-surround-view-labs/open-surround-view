const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');
const fs = require('fs');
const path = require('path');

// Creates res/xml/network_security_config.xml that allows all cleartext traffic
// This is required for local RTSP/HTTP camera streams on Android head units.
const withAndroidNetworkConfig = (config) => {
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'res', 'xml'
      );
      fs.mkdirSync(xmlDir, { recursive: true });

      const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
      <certificates src="user" />
    </trust-anchors>
  </base-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">localhost</domain>
    <domain includeSubdomains="true">127.0.0.1</domain>
    <domain includeSubdomains="true">10.0.0.0/8</domain>
    <domain includeSubdomains="true">192.168.0.0/16</domain>
    <domain includeSubdomains="true">172.16.0.0/12</domain>
  </domain-config>
</network-security-config>`;

      fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), xmlContent);
      return config;
    },
  ]);

  config = withAndroidManifest(config, (config) => {
    const mainApp = config.modResults.manifest.application[0];
    mainApp.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    mainApp.$['android:usesCleartextTraffic'] = 'true';
    return config;
  });

  return config;
};

module.exports = withAndroidNetworkConfig;
