const { withAndroidManifest } = require('expo/config-plugins');
module.exports = function withResizableActivity(config) {
  return withAndroidManifest(config, config => {
    for (const application of config.modResults.manifest.application ?? []) {
      for (const activity of application.activity ?? []) {
        if (activity.$['android:name'] === '.MainActivity') {
          activity.$['android:resizeableActivity'] = 'true';
          delete activity.$['android:screenOrientation'];
        }
      }
    }
    return config;
  });
};
