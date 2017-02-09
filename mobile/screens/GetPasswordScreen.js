import React, { Component, PropTypes } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  AsyncStorage,
  Platform,
  TextInput,
  Keyboard,
  Alert,
  ScrollView,
  ActivityIndicator,
  LayoutAnimation,
} from 'react-native';
import colors from '../config/colors';
import Exponent, { Notifications } from 'exponent';
import {
  NavigationStyles,
} from '@exponent/ex-navigation';
import KeyboardEventListener from 'KeyboardEventListener';
import Router from 'Router';
import Icon from '../components/CrossPlatformIcon';
import connectDropdownAlert from '../utils/connectDropdownAlert';

/**
 *  For getting a user's password in signup or login
 */
@connectDropdownAlert
export default class GetPasswordScreen extends Component {
  static route = {
    navigationBar: {
      visible: true,
      tintColor: colors.black,
      borderBottomColor: 'transparent',
      backgroundColor: 'white',
    },
    styles: {
      ...NavigationStyles.SlideHorizontal,
    },
  }

  static propTypes = {
    school: PropTypes.object.isRequired,
    credentials: PropTypes.object.isRequired,
    navigator: PropTypes.object.isRequired,
    intent: PropTypes.string.isRequired,
    alertWithType: PropTypes.func.isRequired,
  }

  state = {
    password: '',
    loggingIn: false,
    checkedPassword: false,
    keyboardHeight: 0,
    visible: false,
  }

  componentWillMount() {
    this._unsubscribe = KeyboardEventListener.subscribe(this._onKeyboardVisibilityChange);
  }

  componentWillUnmount() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }

  _blurFocusedTextInput = () => {
    TextInput.State.blurTextInput(TextInput.State.currentlyFocusedField());
  };

  _isKeyboardOpen = () => {
    return this.state.keyboardHeight > 0;
  }

  _onKeyboardVisibilityChange = (
    { keyboardHeight, layoutAnimationConfig }:
    { keyboardHeight: number, layoutAnimationConfig: ?Object }) => {
    if (keyboardHeight === 0) {
      this._blurFocusedTextInput();
    }

    if (layoutAnimationConfig) {
      LayoutAnimation.configureNext(layoutAnimationConfig);
    }

    this.setState(() => {
      return {
        keyboardHeight,
      };
    });
  }

  pushToNextScreen = () => {
    Keyboard.dismiss();
    setTimeout(() => { // to make sure the keyboard goes down before autofocus on the next screen
      if (this.state.loggingIn) {
        return;
      }
      if (this.props.intent === 'signup' && !this.state.checkedPassword) {
        this.props.alertWithType('success', '', 'Make sure you\'ve created a memorable password!');
        this.setState(() => {
          return {
            checkedPassword: true,
          };
        });
        return;
      }
      this.setState(() => {
        return { loggingIn: true };
      });
      if (this.state.password.length < 8) {
        this.setState(() => {
          return { loggingIn: false };
        });
        this.props.alertWithType('error', 'Error', 'Password must be at least 8 characters long.');
        return;
      }
      if (this.props.intent === 'signup') {
        global.firebaseApp.auth().createUserWithEmailAndPassword(
          this.props.credentials.email,
          this.state.password,
        ).then(user => {
          user.updateProfile({ displayName: this.props.credentials.name })
          .then(() => {
            user.sendEmailVerification();
          });
          Notifications.getExponentPushTokenAsync().then((token) => {
            global.firebaseApp.database().ref('users').child(user.uid).set({
              phoneNumber: this.props.credentials.phoneNumber,
              school: this.props.school.uid,
              ridesGiven: 0,
              ridesReceived: 0,
              pushToken: token,
              deviceId: Exponent.Constants.deviceId,
              settings: {
                notifications: true,
              },
              displayName: this.props.credentials.name,
              email: this.props.credentials.email,
            });
          });
          try {
            AsyncStorage.setItem('@PUL:user', JSON.stringify({
              ...this.props.credentials,
              password: this.state.password,
            }));
          } catch (error) {
              // Error saving data
          }
          const emailWatch = setInterval(() => {
            if (global.firebaseApp.auth().currentUser.emailVerified) {
              clearInterval(emailWatch);
            }
            global.firebaseApp.auth().currentUser.reload();
          }, 1000);
          this.props.navigator.immediatelyResetStack([Router.getRoute('tabs')], 0);
        }).catch(error => {
          this.setState(() => {
            return { loggingIn: false };
          });
          this.props.alertWithType('error', 'Error', error.toString());
        });
      } else {
        global.firebaseApp.auth().signInWithEmailAndPassword(
          this.props.credentials.email,
          this.state.password,
        ).then(user => {
          if (!user.emailVerified) {
            user.sendEmailVerification();
          }
          Notifications.getExponentPushTokenAsync().then((token) => {
            global.firebaseApp.database().ref('users').child(user.uid).update({
              pushToken: token,
              deviceId: Exponent.Constants.deviceId,
            });
          });
          try {
            AsyncStorage.setItem('@PUL:user', JSON.stringify({
              ...this.props.credentials,
              password: this.state.password,
            }));
          } catch (error) {
              // Error saving data
          }
          const emailWatch = setInterval(() => {
            if (global.firebaseApp.auth().currentUser.emailVerified) {
              clearInterval(emailWatch);
            }
            global.firebaseApp.auth().currentUser.reload();
          }, 1000);
          this.props.navigator.immediatelyResetStack([Router.getRoute('tabs')], 0);
        }).catch(error => {
          this.setState(() => {
            return { loggingIn: false };
          });
          this.props.alertWithType('error', 'Error', error.toString());
        });
      }
    }, 10);
  }

  render() {
    return (
      <ScrollView
        onScroll={ this._blurFocusedTextInput }
        scrollEventThrottle={ 32 }
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        contentContainerStyle={ [styles.container,
          this.state.keyboardHeight ?
          { flex: 1, marginBottom: this.state.keyboardHeight } :
          { flex: 1 },
        ] }
      >
        <View />
        <Choose>
          <When condition={ this.state.loggingIn }>
            <ActivityIndicator size="large" />
          </When>
          <Otherwise>
            <View>
              <View style={ styles.assistedTextInputContainer }>
                <TextInput
                  underlineColorAndroid="transparent"
                  secureTextEntry={ !this.state.visible }
                  autoFocus
                  style={ styles.fieldContents }
                  onChangeText={ (password) => this.setState(() => {
                    return {
                      password: password.trim(),
                    };
                  }) }
                  blurOnSubmit
                  returnKeyType="done"
                  onSubmitEditing={ () => this.pushToNextScreen() }
                  value={ this.state.password }
                  placeholder="Password"
                />
                <TouchableOpacity
                  activeOpacity={ 1 }
                  onPress={ () => this.setState((prevState) => {
                    return {
                      visible: !prevState.visible,
                    };
                  }) }
                >
                  <Icon
                    name="eye"
                    size={ 24 }
                    color={ !this.state.visible ? colors.grey : colors.black }
                  />
                </TouchableOpacity>
              </View>
              <Choose>
                <When condition={ this.props.intent === 'login' }>
                  <TouchableOpacity
                    onPress={ () => {
                      Alert.alert(
                        Platform.OS === 'ios' ? 'Reset Password' : 'Reset password',
                        'Send a password reset email to your email address.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'OK',
                            onPress: () => {
                              global.firebaseApp.auth().sendPasswordResetEmail(this.props.credentials.email);
                            },
                          },
                        ]
                      );
                    } }
                  >
                    <Text style={ styles.resetPassword }>Forgot it?</Text>
                  </TouchableOpacity>
                </When>
              </Choose>
            </View>
          </Otherwise>
        </Choose>
        <Choose>
          <When condition={ this.state.loggingIn }>
            <Text style={ styles.statusText }>{ this.props.intent === 'signup' ? 'Signup in progress...' : 'Logging in...'}</Text>
          </When>
          <Otherwise>
            <TouchableOpacity
              onPress={ () => this.pushToNextScreen() }
              style={ styles.touchable }
            >
              <Text style={ styles.touchableText }>Done</Text>
            </TouchableOpacity>
          </Otherwise>
        </Choose>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  fieldLabel: {
    marginBottom: 8,
    fontFamily: 'open-sans-semibold',
    fontSize: 20,
    color: colors.black,
  },
  fieldContents: {
    fontFamily: 'open-sans',
    height: 40,
    width: Dimensions.get('window').width * 0.60,
    color: colors.black,
    fontSize: 18,
  },
  assistedTextInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  touchable: {
    alignSelf: 'flex-end',
  },
  touchableText: {
    fontFamily: 'open-sans-semibold',
    fontSize: 24,
    color: colors.black,
  },
  statusText: {
    alignSelf: 'flex-end',
    fontFamily: 'open-sans-semibold',
    fontSize: 24,
    color: colors.black,
  },
  resetPassword: {
    fontFamily: 'open-sans',
    fontSize: 14,
    color: colors.black,
  },
});