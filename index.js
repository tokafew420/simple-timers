(function (window) {
    /** Vars */
    const opts = {
        background: true,
        rotateBg: true,
        sound: true,
        minBefore: 5
    };
    const sounds = (function () {
        let playInterval;

        return {
            $tick: $('#audio-tick'),
            $click: $('#audio-open'),
            $blop: $('#audio-blop'),
            $buzzer: $('#audio-buzzer'),
            $break: $('#audio-break'),
            $activate: $('#audio-activate'),
            $end: $('#audio-end'),
            play: ($sound) => {
                if (opts.sound) {
                    $sound[0].pause();
                    $sound[0].currentTime = 0;
                    $sound[0].play();
                }
            },
            startLoop: ($sound, ms) => {
                clearInterval(playInterval);
                if (opts.sound) {
                    playInterval = setInterval(() => $sound[0].play(), ms);
                }
            },
            stopLoop: () => {
                clearInterval(playInterval);
                playInterval = null;
            }
        }
    }());
    const formats = [
        'dddd, MMMM Do YYYY, h:mm:ss A', // Wednesday, September 9th 2020, 8:57:09 PM
        'MMMM Do YYYY, h:mm:ss A', // September 9, 2020 8:59 PM
        'MMM Do YYYY, h:mm:ss A', // Sep 9, 2020 8:59 PM
        'MM/DD/YYYY h:mm:ss A', // 9/9/2020 8:59 PM
        'MM-DD-YYYY h:mm:ss A', // 9/9/2020 8:59 PM
    ];
    let timers = [];

    /** Helpers */
    const getNow = () => new Date();

    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    const getViewportSize = () => {
        const $window = $(window);
        return {
            h: $window.height(),
            w: $window.width()
        };
    };

    const supportTimeInput = () => {
        try {
            var input = document.createElement('input');
            input.type = 'time';

            return input.type === 'time';
        } catch (e) {
            debug('Time input not supported', e);
        }
        return false;
    };

    const getQueryString = (url) => {
        url = url || window.location.search;
        const idx = url.indexOf('?');
        const qs = idx === -1 ? '' : url.substring(idx + 1);

        return qs
            .split('&')
            .map((kvp) => kvp.split('='))
            .reduce((acc, [key, val]) => {
                if (val !== '' && !isNaN(+val)) {
                    val = +val;
                } else if (val) {
                    val = decodeURI(val);
                } else {
                    val = true;
                }

                if (typeof acc[key] === 'undefined') {
                    acc[key] = val;
                } else {
                    if (!Array.isArray(acc[key])) acc[key] = [acc[key]];
                    acc[key].push(val);
                }
                return acc;
            }, {});
    };

    const sanitizeName = (name) => (name || '').replace(/(\r\n|\n|\r)/gm, '').trim();

    $.fn.setValidity = function (isValid, message) {
        return this.each(function () {
            const $this = $(this);
            const $inputGrp = $this.closest('.input-group');
            const $feedback = $inputGrp.siblings('.invalid-feedback');

            $this.add($inputGrp).toggleClass('is-invalid', isValid === false);
            message && $feedback.text(message);
        });
    };

    $.fn.isValid = function () {
        return !$(this).hasClass('is-invalid');
    };

    const saveLocal = (key, obj) => {
        window.localStorage.setItem('simple-timers.' + key, JSON.stringify(obj));
        debug('Save local data', 'simple-timers.' + key, JSON.stringify(obj));
    };

    const saveTimers = () => {
        const now = getNow();
        saveLocal('timers', {
            timers: timers.filter((timer) => timer.endTime >= now)
                .map((timer) => {
                    return {
                        endTime: timer.endTime.getTime(),
                        name: timer.name,
                        minBefore: timer.minBefore
                    };
                })
        });
    }

    const getLoopInterval = (sec) => {
        if (sec < 10) return 250;
        if (sec < 30) return 500;
        if (sec < 60) return 1000;
        if (sec < 120) return 1500;
        if (sec < 150) return 2000;
        if (sec < 180) return 2500;
        return 3000;
    };

    const getAnimationInterval = (sec) => {
        if (sec < 30) return 3;
        if (sec < 60) return 2;
        if (sec < 120) return 1;
        return 0;
    };

    /** Global **/
    const $debug = $('#debug');
    const isDebug = !!getQueryString().debug;
    const $attribution = $('#attribution');
    const $photographer = $('.photographer', $attribution);
    const $changeBackgroundBtn = $('#change-background-btn', $attribution);
    let bg = {};

    const logger = (lvl, ...args) => {
        if (isDebug) {
            $debug.prepend(`<code class="${lvl}">${args.join(', ')}</code>`);
        }
        console[lvl](...args);
    };
    const log = logger.bind(null, 'log');
    const debug = logger.bind(null, 'debug');
    const error = logger.bind(null, 'error');

    if (isDebug) {
        window.onerror = function (message, source, lineno, colno, err) {
            error(`${message}\n\t${source}:${lineno},${colno}\n\t${err}`);
        }
        $debug.closest('.row').removeClass('d-none');
    }

    const setBackground = () => {
        if (opts.background) {
            if (bg.name && bg.url) {
                debug('Set saved background');
                $photographer.text(bg.name);
                $('body').css('background-image', `url(${bg.url})`);
            } else {
                debug('Request new background');

                const viewport = getViewportSize();
                $.getJSON(`https://api.unsplash.com/photos/random?client_id=Xy8zbnyDJZR1I8xv5m8p_G5khxSdCmGfMgZsZu8A2rA&query=wallpapers-nature`, function (res, status, xhr) {
                    if (res && res.user && res.urls) {
                        debug('Random background retrieved');
                        bg.name = res.user.name;
                        bg.url = res.urls.regular;
                        bg.date = moment().format('YYYYMMDD');

                        if (bg.name && bg.url) {
                            $photographer.text(bg.name);
                            $('body').css('background-image', `url(${bg.url})`);
                            saveLocal('background', bg);
                        }
                    } else {
                        error('Failed to retrieve new background', res);
                    }
                });
            }
        } else {
            debug('Background image disabled');
            $('body').css('background-image', 'none');
        }
    };

    $changeBackgroundBtn.on('click', (e) => {
        e.preventDefault();
        bg = {};
        setBackground();
    });

    /** Loader **/
    const $loader = $('.loader-container');
    const $loaderMsg = $('.msg', $loader);

    /** Navbar **/
    const $navbar = $('#navbar');

    $('html').on('click', () => $navbar.collapse('hide'));
    $('a', $navbar).on('click', () => $navbar.collapse('hide'));

    /** Now card **/
    const $nowCard = $('.now-card');
    const $now = $('#now', $nowCard);
    let nowFormat = 0;

    $now.text(moment().format(formats[nowFormat]));

    $nowCard.on('click', () => {
        nowFormat = (nowFormat + 1) % formats.length;
        $now.text(moment().format(formats[nowFormat]));
    }).on('click', () => sounds.play(sounds.$click));

    /** Timers */
    const $timers = $('.timers');
    const $cardTmpl = $('#timer-card-template .timer-row');

    const createTimerCard = (timer) => {
        const $card = $cardTmpl.clone();
        if (timer.name) {
            $('.timer-name', $card).text(timer.name).closest('.row').removeClass('d-none');
        }
        $('.timer-until', $card).text(moment(timer.endTime).format('hh:mm A'));

        $card.appendTo($timers);
        timer.$card = $card;
        timer.$name = $('.timer-until', $card);
        timer.$left = $('.timer-left', $card);
        timer.$timeLeft = $('.timer-time-left', $card);
        $card.data('timer', timer);

        $('.timer-row', $timers).sort((a, b) => {
            a = $(a).data('timer').endTime;
            b = $(b).data('timer').endTime;
            return a - b;
        }).appendTo($timers);
    }

    const destroyTimerCard = (timer) => {
        if (timer && timer.$card) timer.$card.remove();
        const idx = timers.indexOf(timer);
        if (idx !== -1) {
            timers.splice(idx, 1);
            sounds.play(sounds.$break);
        }
    }

    $('body').on('mouseenter', '.card', () => sounds.play(sounds.$blop));

    $timers.on('click', '.timer-remove', function () {
        const timer = $(this).closest('.timer-row').data('timer');
        if (timer) destroyTimerCard(timer);
        saveTimers();
    }).on('click', '.timer-name-edit', function () {
        $('.timer-name', $(this).parent()).focus();
    }).on('keydown', '.timer-name', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            $(this).blur();
        }
    }).on('paste', '.timer-name', (e) => {
        e.preventDefault();
        const name = sanitizeName((e.originalEvent.clipboardData || window.clipboardData).getData('text'));
        const selection = window.getSelection();

        if (!selection.rangeCount) return false;
        selection.deleteFromDocument();
        selection.getRangeAt(0).insertNode(document.createTextNode(name));
    }).on('input', '.timer-name', function (e) {
        if (e.type === 'input' && e.originalEvent.inputType !== 'insertFromDrop') return;
        const $this = $(this);
        $this.text(sanitizeName($this.text()));
    }).on('blur', '.timer-name', function () {
        const $this = $(this);
        const timer = $this.closest('.timer-row').data('timer');
        const name = sanitizeName($this.text());

        if (!name) {
            $this.closest('.row').addClass('d-none');
        }
        if (timer) {
            timer.name = name;
            saveTimers();
        }
    });

    /** New timer **/
    const $newTimerDlg = $('#new-timer-modal');
    const $newTimerInvalidFeedback = $('.invalid-time', $newTimerDlg);
    const $newTimerHour = $('#new-timer-hour-input', $newTimerDlg);
    const $newTimerMin = $('#new-timer-minute-input', $newTimerDlg);
    const $newTimerSec = $('#new-timer-second-input', $newTimerDlg);
    const $newTimerName = $('#new-timer-name-input', $newTimerDlg);
    const $newTimerMinBefore = $('#new-timer-minutes-before-input', $newTimerDlg);
    const $newTimerAddBtn = $('#new-timer-add-btn', $newTimerDlg);

    $newTimerMinBefore.val(opts.minBefore);

    $newTimerDlg.modal({
        backdrop: 'static',
        keyboard: false,
        focus: true,
        show: false
    }).on('show.bs.modal', () => {
        $newTimerInvalidFeedback.hide();
        $newTimerHour.setValidity();
        $newTimerMin.setValidity();
        $newTimerSec.setValidity();
        $newTimerName.setValidity().val('');
        $newTimerMinBefore.setValidity();
    });

    $newTimerAddBtn.on('click', () => {
        $newTimerInvalidFeedback.hide();
        const hours = +$newTimerHour.setValidity().val();
        const minutes = +$newTimerMin.setValidity().val();
        const seconds = +$newTimerSec.setValidity().val();
        const name = ($newTimerName.setValidity().val() || '').trim();
        const minBefore = +$newTimerMinBefore.setValidity().val();

        if (isNaN(hours)) $newTimerHour.setValidity(false);
        if (isNaN(minutes)) $newTimerMin.setValidity(false);
        if (isNaN(seconds)) $newTimerSec.setValidity(false);
        if (isNaN(minBefore)) $newTimerMinBefore.setValidity(false);

        if ($('.is-invalid', $newTimerDlg).length) return;

        if (!hours && !minutes && !seconds) {
            $newTimerInvalidFeedback.show();
            return;
        }

        createTimer(hours, minutes, seconds, minBefore, name);
        $newTimerDlg.modal('hide');
    });

    $newTimerHour.add($newTimerMin)
        .add($newTimerSec)
        .add($newTimerName)
        .add($newTimerMinBefore)
        .on('keyup', (e) => {
            if (e.key === 'Enter') {
                $newTimerAddBtn.click();
            }
        });

    const createTimer = (hours, minutes, seconds, minBefore, name) => {
        const later = getNow();
        later.setHours(later.getHours() + hours);
        later.setMinutes(later.getMinutes() + minutes)
        later.setSeconds(later.getSeconds() + seconds, 0);

        const timer = {
            endTime: later,
            name: name,
            minBefore: minBefore
        };
        timers.push(timer);
        createTimerCard(timer);
        saveTimers();

        return later;
    };

    /** New alarm **/
    const $newAlarmDlg = $('#new-alarm-modal');
    const $newAlarmInvalidFeedback = $('.invalid-time', $newAlarmDlg);
    const $newAlarmTime = $('#new-alarm-time-input', $newAlarmDlg);
    const $newAlarmHour = $('#new-alarm-hour-input', $newAlarmDlg);
    const $newAlarmMin = $('#new-alarm-minute-input', $newAlarmDlg);
    const $newAlarmTt = $('#new-alarm-tt-lbl', $newAlarmDlg);
    const $newAlarmName = $('#new-alarm-name-input', $newAlarmDlg);
    const $newAlarmMinBefore = $('#new-alarm-minutes-before-input', $newAlarmDlg);
    const $newAlarmAddBtn = $('#new-alarm-add-btn', $newAlarmDlg);
    const isTimeInputSupported = supportTimeInput();

    const getNewAlarmTime = () => {
        const now = getNow();
        const later = getNow();
        let hour = 0;
        let minute = 0;
        if (isTimeInputSupported) {
            let time = $newAlarmTime.val();
            if (/^[0-2][0-9]:[0-5][0-9]$/.test(time)) {
                const hhmm = time.split(':');
                hour = +hhmm[0];
                minute = +hhmm[1];
            } else {
                $newAlarmTime.setValidity(false);
            }
        } else {
            hour = +$newAlarmHour.val();
            minute = +$newAlarmMin.val();
        }
        later.setHours(hour, minute, 0, 0);
        if (later < now) later.setDate(now.getDate() + 1);

        return later;
    };

    const createAlarm = (later, minBefore, name) => {
        const timer = {
            endTime: later,
            name: name,
            minBefore: minBefore
        };
        timers.push(timer);
        createTimerCard(timer);
        saveTimers();
    };

    if (isTimeInputSupported) {
        $newAlarmTime.closest('.row').removeClass('d-none');
    } else {
        $newAlarmHour.closest('.row').removeClass('d-none');
    }

    $newAlarmMinBefore.val(opts.minBefore);

    $newAlarmDlg.modal({
        backdrop: 'static',
        keyboard: false,
        focus: true,
        show: false
    }).on('show.bs.modal', () => {
        $newAlarmInvalidFeedback.hide();
        const now = getNow();
        let hour = now.getHours();

        if (isTimeInputSupported) {
            $newAlarmTime.setValidity().val(moment().format('HH:mm'));
        } else {
            $newAlarmHour.empty();
            for (let i = 0; i < 12; i++) {
                let lbl = hour % 12;
                if (!lbl) lbl = 12;
                $newAlarmHour.append('<option value="' + hour + '">' + lbl + '</option>');
                hour++;
            }
            $newAlarmHour.val($('option', $newAlarmHour).eq(0).val());
            $newAlarmMin.val(now.getMinutes() + 1);
            $newAlarmTt.text(moment().format('A'));
        }
        $newAlarmName.setValidity().val('');
        if (!$newAlarmMinBefore.isValid()) $newAlarmMinBefore.val(opts.minBefore);
    });

    $newAlarmHour.add($newAlarmMin).on('change', () => {
        $newAlarmInvalidFeedback.hide();
        const later = getNewAlarmTime();
        $newAlarmTt.text(moment(later).format('A'));
    });

    $newAlarmAddBtn.on('click', () => {
        $newAlarmInvalidFeedback.hide();
        const now = getNow();
        const later = getNewAlarmTime();
        const name = ($newAlarmName.setValidity().val() || '').trim();
        const minBefore = +$newAlarmMinBefore.setValidity().val();

        if (isNaN(minBefore)) $newAlarmMinBefore.setValidity(false);

        if ($('.is-invalid', $newTimerDlg).length) return;

        if (later > now) {
            createAlarm(later, +$newAlarmMinBefore.val(), name);
            $newAlarmDlg.modal('hide');
        } else {
            $('.invalid-time', $newAlarmDlg).show();
        }
    });

    $newAlarmTime.add($newAlarmHour)
        .add($newAlarmMin)
        .add($newAlarmName)
        .add($newAlarmMinBefore)
        .on('keyup', (e) => {
            if (e.key === 'Enter') {
                $newAlarmAddBtn.click();
            }
        });

    /** Clear **/
    const clearAll = () => {
        for (let i = timers.length - 1; i >= 0; i--) {
            destroyTimerCard(timers[i]);
        }

        saveTimers();
    }

    $('.clear-all-link').on('click', () => clearAll());

    /** Settings **/
    const $settingsDlg = $('#settings-modal');
    const $buzzerFileSection = $('#buzzer-sound-file-section', $settingsDlg);
    const $buzzerFileInput = $('#buzzer-sound-file-input', $buzzerFileSection);
    const $buzzerResetBtn = $('#buzzer-sound-reset-btn', $buzzerFileSection);
    const $recordSection = $('#settings-record-audio-section', $settingsDlg);
    const $recordBtn = $('#settings-record-audio-btn', $recordSection);
    const $recordPlayer = $('#settings-record-audio-player', $recordSection);
    const $enableSound = $('#enable-sound', $settingsDlg);
    const $enableBgImage = $('#enable-background-image', $settingsDlg);
    const $rotateBgImage = $('#rotate-background-image', $settingsDlg);
    const $settingsSaveBtn = $('#settings-save-btn', $settingsDlg);
    let buzzer;
    let newBuzzer;
    let buzzerChanged = false;
    let microphonePerm = 'denied';
    let recording = false;

    const setBuzzerSound = (buzzer) => {
        sounds.$buzzer.attr('src', buzzer && buzzer.src || './sounds/air-horn.mp3');
        sounds.$buzzer[0].load();
    };

    const setBuzzerInputs = (buzzer) => {
        if (buzzer && buzzer.name && buzzer.src) {
            $('label[for="buzzer-sound-file-input"]', $settingsDlg).text(buzzer.name);
            $recordPlayer.attr('src', buzzer.src);
            $buzzerFileSection.addClass('has-file');
        } else {
            $('label[for="buzzer-sound-file-input"]', $settingsDlg).text('Choose File');
            $recordPlayer.attr('src', './sounds/air-horn.mp3');
            $buzzerFileSection.removeClass('has-file');
        }
    };

    const setRecordState = (state) => {
        microphonePerm = state;
        $recordSection.removeClass('granted prompt denied')
            .addClass(state);
        setRecordingState(false);
        debug('Microphone permission', microphonePerm);
    };

    const setRecordingState = (state) => {
        recording = !!state;
        $recordSection.toggleClass('recording', recording);
        $('.pulse', $recordBtn).toggleClass('pulsing', recording);
        debug('Recording state', recording)
    };

    $settingsDlg.on('show.bs.modal', () => {
        newBuzzer = null;
        buzzerChanged = false;
        setBuzzerInputs(buzzer);
        $enableBgImage.prop('checked', opts.background);
        $rotateBgImage.prop('checked', opts.rotateBg);
        $enableSound.prop('checked', opts.sound);
    });

    $buzzerFileInput.on('change', async () => {
        const file = $buzzerFileInput[0].files[0];
        if (file) {
            const result = await toBase64(file).catch(e => Error(e));
            if (result instanceof Error) {
                log('Buzzer input file error: ', result.message);
                return;
            }
            newBuzzer = {
                name: file.name,
                src: result
            };
        } else {
            newBuzzer = null;
        }
        buzzerChanged = true;
        setBuzzerInputs(newBuzzer);

        debug('Buzzer input file changed', newBuzzer);
    });

    $buzzerResetBtn.on('click', () => {
        debug('Reset buzzer file input');
        $buzzerFileInput.val('').change();
    });

    $recordBtn.on('click', () => {
        if (!recording) {
            debug('Recording initiated');

            setRecordingState(true);

            navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: false
                })
                .then(function (stream) {
                    debug('Microphone initialized');

                    const options = {
                        mimeType: 'audio/webm'
                    };
                    const recordedChunks = [];
                    const mediaRecorder = new MediaRecorder(stream, options);

                    mediaRecorder.addEventListener('dataavailable', function (e) {
                        debug('mediaRecorder dataavailable');
                        if (e.data.size > 0) {
                            recordedChunks.push(e.data);
                        }

                        if (!recording && mediaRecorder.state !== 'inactive') {
                            mediaRecorder.stop();
                        }
                    });

                    mediaRecorder.addEventListener('stop', async () => {
                        debug('Recording stopped');
                        sounds.play(sounds.$end);
                        $recordSection.removeClass('started');

                        if (recordedChunks.length) {
                            const result = await toBase64(new Blob(recordedChunks, {
                                type: options.mimeType
                            })).catch(e => Error(e));
                            if (result instanceof Error) {
                                log('Recording error: ', result.message);
                                return;
                            }
                            newBuzzer = {
                                name: 'Custom Recording',
                                src: result
                            };
                            buzzerChanged = true;
                            setBuzzerInputs(newBuzzer);
                            debug('Custom recording for buzzer');
                        }
                    });

                    mediaRecorder.addEventListener('start', async () => {
                        debug('Recording started');
                        $recordSection.addClass('started');
                    });

                    setTimeout(() => {
                        if (recording) {
                            debug('Recording timeout');
                            setRecordingState(false);
                        }
                    }, 3000);
                    mediaRecorder.start(500);
                }, (e) => {
                    // Generally permission is denied
                    error(e);
                });
        } else {
            debug('Recording manually stopped');
            setRecordingState(false);
        }
    });

    $settingsSaveBtn.on('click', () => {
        if (buzzerChanged) {
            buzzer = newBuzzer;
            saveLocal('buzzer', buzzer);
            setBuzzerSound(buzzer);
            buzzerChanged = false;
        }

        opts.sound = $enableSound.is(':checked');
        if (!opts.sound) {
            sounds.stopLoop();
        } else if (loopMs) {
            sounds.startLoop(sounds.$tick, loopMs);
        }

        opts.rotateBg = $rotateBgImage.is(':checked');
        const backgroud = $enableBgImage.is(':checked');
        if (opts.background !== backgroud) {
            opts.background = backgroud;
            setBackground();
            $attribution.toggle(opts.background);
        }
        saveLocal('opts', opts);

        $settingsDlg.modal('hide');
    });

    navigator.permissions.query({
        name: 'microphone'
    }).then(function (result) {
        setRecordState(result.state);
        result.onchange = function () {
            setRecordState(this.state);
        };
    });

    if (navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Has recording feature
        $recordSection.removeClass('d-none');
    }

    /** Voice **/
    const utterance = 'speechSynthesis' in window ? new SpeechSynthesisUtterance() : null;
    if (utterance) {
        window.speechSynthesis.onvoiceschanged = () => {
            // Note: some voices don't support altering params

            // Voices as of 11/11/2020
            // Microsoft David Desktop - English (United States) (en-US)
            // Microsoft Zira Desktop - English (United States) (en-US)
            // Google Deutsch (de-DE)
            // Google US English (en-US)
            // Google UK English Female (en-GB)
            // Google UK English Male (en-GB)
            // Google español (es-ES)
            // Google español de Estados Unidos (es-US)
            // Google français (fr-FR)
            // Google हिन्दी (hi-IN)
            // Google Bahasa Indonesia (id-ID)
            // Google italiano (it-IT)
            // Google 日本語 (ja-JP)
            // Google 한국의 (ko-KR)
            // Google Nederlands (nl-NL)
            // Google polski (pl-PL)
            // Google português do Brasil (pt-BR)
            // Google русский (ru-RU)
            // Google 普通话（中国大陆） (zh-CN)
            // Google 粤語（香港） (zh-HK)
            // Google 國語（臺灣） zh-TW

            var voices = window.speechSynthesis.getVoices()
                .filter((v) => v.name === 'Google US English' && v.lang === 'en-US');

            if (voices.length) {
                utterance.voice = voices[0];
                utterance.lang = voices[0].lang;
            }
        };

        utterance.volume = 1; // 0 to 1; Default 1
        utterance.rate = 0.9; // 0.1 to 10; Default 1
        utterance.pitch = 1; // 0 to 2; Default 1
    }

    const speak = function (text) {
        if (utterance) {
            utterance.text = text
            speechSynthesis.speak(utterance);
        }
    };

    if (window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition) {
        var recognition = new(window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition)();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        const exampleTexts = [
            'Set a 15 minute timer.',
            'Set an alarm for 2:30.',
            'Set a timer for 1 minute and 30 seconds.',
        ];
        const confirmTexts = [
            'Okay.',
            'You got it!',
            'Alright.'
        ];
        let confirmIdx = 0;
        let exampleIdx = 0;
        let isListening = false;
        let understand = false;
        let startTime;

        const $voiceBtn = $('#voice-btn');
        const $voiceRow = $voiceBtn.closest('.row');
        const $voiceFeedback = $('#voice-feedback');
        const $voiceFeedbackRow = $voiceFeedback.closest('.row');
        const hrRegex = /(\d+)[\s\-]+hour/i;
        const minRegex = /(\d+)[\s\-]+minute/i;
        const secRegex = /(\d+)[\s\-]+second/i;
        const hhmmRegex = /((1[0-2]|0?[1-9])(:([0-5][0-9]))? ?([AP]\.?M\.?)?)/i;

        $voiceBtn.on('click', (evt) => {
            if (isListening) {
                debug('Abort listening.');
                recognition.abort();
                sounds.play(sounds.$end);
                $voiceFeedbackRow.collapse('hide');
                $('.pulse', $voiceBtn).removeClass('pulsing');
                isListening = false;
            } else {
                recognition.start();
                exampleIdx = ++exampleIdx % exampleTexts.length;
                $voiceFeedback.html('<div><strong>Say a command <span class="wave"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span></strong></div>');
                $voiceFeedbackRow.collapse('show');
                startTime = evt.timeStamp;
            }
        });

        recognition.onstart = () => {
            debug('Start listening...');
            understand = false;
            sounds.play(sounds.$activate);
            $('.pulse', $voiceBtn).addClass('pulsing');
            isListening = true;
        };

        recognition.onend = () => {
            debug('Stop listening.');
            if (!understand) {
                sounds.play(sounds.$end);
                exampleIdx = ++exampleIdx % exampleTexts.length;
                $voiceFeedback.html(`<div>Try saying <strong><i>"${exampleTexts[exampleIdx]}"</i></strong></div>`);
            }
            $('.pulse', $voiceBtn).removeClass('pulsing');
            isListening = false;
        };

        recognition.onresult = function (event) {
            let transcript = (event.results[0][0].transcript || '').toLowerCase();
            log(transcript);
            const isTimer = transcript.indexOf('timer') !== -1;
            const isAlarm = transcript.indexOf('alarm') !== -1;
            const feedback = [];
            $voiceFeedbackRow.collapse('show');

            if (isTimer) {
                let hr = +(transcript.match(hrRegex) || [])[1] || 0;
                let min = +(transcript.match(minRegex) || [])[1] || 0;
                let sec = +(transcript.match(secRegex) || [])[1] || 0;

                // Normalize
                sec += (min * 60) + (hr * 3600);
                hr = Math.floor(sec / 3600);
                sec = sec % 3600;
                min = Math.floor(sec / 60);
                sec = sec % 60;

                if (hr) {
                    feedback.push(`${hr} hour${hr > 1 ? 's' : ''}`);
                }
                if (min) {
                    if (hr && sec) {
                        feedback.push(', ');
                    } else if (hr && !sec) {
                        feedback.push(' and ');
                    }
                    feedback.push(`${min} minute${min > 1 ? 's' : ''}`);
                }
                if (sec) {
                    if (hr && min) {
                        feedback.push(', and ');
                    } else if (hr || min) {
                        feedback.push(' and ');
                    }
                    feedback.push(`${sec} second${sec > 1 ? 's' : ''}`);
                }
                if (feedback.length) {
                    understand = true;
                    createTimer(hr, min, sec, +$newTimerMinBefore.val() || 0, '');
                    confirmIdx = ++confirmIdx % confirmTexts.length;
                    $voiceFeedback.html(`<div>${confirmTexts[confirmIdx]} Timer set for <strong>${feedback.join('')}</strong>.</div>`);
                    speak($voiceFeedback.text());
                    $newTimerHour.val(hr ? hr : '');
                    $newTimerMin.val(min ? min : '');
                    $newTimerSec.val(sec ? sec : '');
                    return;
                }
            } else if (isAlarm) {
                let match = transcript.match(hhmmRegex) || [];
                if (match.length) {
                    let hr = +match[2];
                    let min = +match[4] || 0;
                    let tt = match[5];
                    const now = getNow();
                    const later = getNow();

                    if (hr) {
                        if (tt) {
                            if (hr < 12 && tt.replace(/\./g, '').toLowerCase() === 'pm') {
                                hr += 12;
                            }
                            later.setHours(hr, min, 0, 0);
                            if (later < now) {
                                later.setDate(later.getDate() + 1);
                            }
                        } else {
                            later.setHours(hr, min, 0, 0);
                            if (later < now) {
                                later.setHours(later.getHours() + 12);
                                if (later < now) {
                                    later.setHours(later.getHours() + 12);
                                }
                            }
                        }

                        if (later > now) {
                            understand = true;
                            createAlarm(later, +$newAlarmMinBefore.val(), '');
                            confirmIdx = ++confirmIdx % confirmTexts.length;
                            $voiceFeedback.html(`<div>${confirmTexts[confirmIdx]} Alarm set for <strong>${moment(later).format('h:mm A')}</strong>.</div>`);
                            speak($voiceFeedback.text());
                            return;
                        }
                    }
                }
            }
            exampleIdx = ++exampleIdx % exampleTexts.length;
            $voiceFeedback.html(`<div>You said: "<strong><i>${transcript}</i></strong>"</div><div>Try saying <strong><i>"${exampleTexts[exampleIdx]}"</i></strong></div>`);
        };

        recognition.onerror = (evt) => {
            error(evt.error);
            if (evt.error == 'audio-capture') {
                $voiceFeedback.html('<div><strong>No microphone was found. Ensure that a microphone is installed and the <i>microphone settings</i> are configured correctly.</strong></div>').collapse('show');
                understand = true;
            } else if (evt.error == 'not-allowed') {
                if (evt.timeStamp - startTime < 100) {
                    $voiceFeedback.html('<div><strong>Permission to use microphone is blocked.</strong></div>').collapse('show');
                } else {
                    $voiceFeedback.html('<div><strong>Permission to use microphone was denied.</strong></div>').collapse('show');
                }
                understand = true;
            }
        };

        [
            'onaudiostart',
            'onaudioend',
            'onnomatch',
            'onsoundstart',
            'onsoundend',
            'onspeechend'
        ].forEach((eventName) => {
            recognition[eventName] = (e) => {
                debug(eventName, e);
            };
        });

        $voiceRow.removeClass('d-none');
    }

    /** Re-hydrate **/
    const rehydrate = (key, fn) => {
        try {
            const savedData = window.localStorage.getItem('simple-timers.' + key);
            const data = JSON.parse(savedData);
            if (data) {
                return fn(data) || true;
            }
        } catch (e) {
            error('Failed to rehydrate ' + key, e);
        }
        return false;
    };

    let rehydrated = rehydrate('opts', (data) => {
        opts.background = !!data.background;
        opts.rotateBg = !!data.rotateBg;
        opts.sound = !!data.sound;
        opts.minBefore = typeof data.minBefore === 'number' ? data.minBefore : 5;
    });

    rehydrated = rehydrate('timers', (data) => {
        const now = getNow();
        timers = data.timers.map((timer) => {
            return {
                endTime: new Date(timer.endTime),
                name: timer.name,
                minBefore: timer.minBefore
            };
        }).filter((timer) => timer.endTime >= now);

        timers.forEach((timer) => createTimerCard(timer));
    });

    rehydrated = rehydrate('buzzer', (data) => {
        setBuzzerSound(data)
        buzzer = data;
    });

    rehydrated = rehydrate('background', (data) => {
        const currentDate = moment().format('YYYYMMDD');
        bg = data || {};

        if (bg.date !== currentDate && opts.rotateBg) {
            bg = {};
        }
        setBackground();
        $attribution.toggle(opts.background);
    });

    if (!rehydrated) {
        $(() => setBackground());
        $attribution.toggle(opts.background);
    }

    /** Main driver **/
    let loopMs = 0;
    setInterval(() => {
        const now = getNow();
        $now.text(moment().format(formats[nowFormat]));

        let hasMinBefore = false;
        let minLeft = 0;
        timers.forEach((timer) => {
            if (timer.ended) return;
            const left = Math.floor((timer.endTime - now) / 1000);

            if (left <= 0) {
                timer.$card.removeClass('timer-danger timer-danger-1 timer-danger-2 timer-danger-3')
                    .addClass('timer-over');
                timer.$left.text('Finished!!');
                sounds.play(sounds.$buzzer);
                timer.ended = true;
            } else {
                const sec = left % 60;
                const min = Math.floor(left / 60) % 60;
                const hour = Math.floor(left / 3600);

                timer.$timeLeft.text(String(hour).padStart(2, '0') + ':' +
                    String(min).padStart(2, '0') + ':' +
                    String(sec).padStart(2, '0'));

                if (left < (timer.minBefore * 60)) {
                    hasMinBefore = true;
                    if (!minLeft || left < minLeft) {
                        minLeft = left;
                    }

                    timer.$card.addClass('timer-danger');
                    const animationInterval = getAnimationInterval(left);
                    if (animationInterval) {
                        timer.$card.removeClass('timer-danger-' + (animationInterval - 1))
                            .addClass('timer-danger-' + animationInterval);
                    }
                }
            }
        });

        if (hasMinBefore) {
            const ms = getLoopInterval(minLeft);
            if (ms != loopMs) {
                loopMs = ms;
                sounds.startLoop(sounds.$tick, loopMs);
            }
        } else {
            sounds.stopLoop();
            loopMs = 0;
        }
    }, 1000);
})(window);