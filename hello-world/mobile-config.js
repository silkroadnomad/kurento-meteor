App.info({
  id: 'de.lespace.kurentometeor',
  name: 'helloWorld',
  description: 'a simple Kurento WebRTC Example',
  author: 'Nico Krause',
  email: 'nico@le-space.de',
  website: 'http://www.le-space.de'
});

// Set up resources such as icons and launch screens.
// App.icons({
//   'iphone': 'icons/icon-60.png',
//   'iphone_2x': 'icons/icon-60@2x.png',
//   // ... more screen sizes and platforms ...
// });

// App.launchScreens({
//   'iphone': 'splash/Default~iphone.png',
//   'iphone_2x': 'splash/Default@2x~iphone.png',
//   // ... more screen sizes and platforms ...
// });

// Set PhoneGap/Cordova preferences
// App.setPreference('BackgroundColor', '0xff0000ff');


App.accessRule('http://*');
App.accessRule('https://*');
App.accessRule('*');
App.accessRule('*://173.194.71.127:*');
App.accessRule('*5.9.154.226:*');
App.accessRule('*://localhost:*');
App.accessRule('*://192.168.192.251:*');  
