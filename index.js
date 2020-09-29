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

    $.fn.setValidity = function (isValid, message) {
        return this.each(function () {
            const $this = $(this);
            const $inputGrp = $this.closest('.input-group');
            const $feedback = $inputGrp.siblings('.invalid-feedback');

            $this.add($inputGrp).toggleClass('is-invalid', isValid === false);
            message && $feedback.text(message);
        });
    };

    const saveLocal = (key, obj) => {
        window.localStorage.setItem('simple-timers.' + key, JSON.stringify(obj));
    };

    const saveTimers = () => {
        const now = new Date();
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
    const $attribution = $('#attribution');
    const $photographer = $('.photographer', $attribution);
    const $changeBackgroundBtn = $('#change-background-btn', $attribution);
    let bg = {};

    const setBackground = () => {
        if (opts.background) {
            if (bg.name && bg.url) {
                $photographer.text(bg.name);
                $('body').css('background-image', `url(${bg.url})`);
            } else {
                const viewport = getViewportSize();
                $.getJSON(`https://api.unsplash.com/photos/random?client_id=Xy8zbnyDJZR1I8xv5m8p_G5khxSdCmGfMgZsZu8A2rA&query=nature,water`, function (res, status, xhr) {
                    if (res && res.user && res.urls) {
                        bg.name = res.user.name;
                        bg.url = res.urls.regular;
                        bg.date = moment().format('YYYYMMDD');

                        if (bg.name && bg.url) {
                            $photographer.text(bg.name);
                            $('body').css('background-image', `url(${bg.url})`);
                            saveLocal('background', bg);
                        }
                    }
                });
            }
        } else {
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
            $('.timer-name', $card).text(timer.name).removeClass('d-none');
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

    $('body').on('click', '.timer-remove', function () {
        const timer = $(this).closest('.timer-row').data('timer');
        if (timer) destroyTimerCard(timer);
        saveTimers();
    }).on('mouseenter', '.card', () => sounds.play(sounds.$blop));

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
        const later = new Date();
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
        $newTimerDlg.modal('hide');
    });

    /** New alarm **/
    const $newAlarmDlg = $('#new-alarm-modal');
    const $newAlarmInvalidFeedback = $('.invalid-time', $newAlarmDlg);
    const $newAlarmHour = $('#new-alarm-hour-input', $newAlarmDlg);
    const $newAlarmMin = $('#new-alarm-minute-input', $newAlarmDlg);
    const $newAlarmTt = $('#new-alarm-tt-lbl', $newAlarmDlg);
    const $newAlarmName = $('#new-alarm-name-input', $newAlarmDlg);
    const $newAlarmMinBefore = $('#new-alarm-minutes-before-input', $newAlarmDlg);
    const $newAlarmAddBtn = $('#new-alarm-add-btn', $newAlarmDlg);

    const getNewAlarmTime = () => {
        const hour = +$newAlarmHour.val();
        const minute = +$newAlarmMin.val();
        const later = new Date();
        later.setHours(hour, minute, 0, 0);

        return later;
    };

    $newAlarmMinBefore.val(opts.minBefore);

    $newAlarmDlg.modal({
        backdrop: 'static',
        keyboard: false,
        focus: true,
        show: false
    }).on('show.bs.modal', () => {
        $newAlarmInvalidFeedback.hide();
        const now = new Date();
        let hour = now.getHours();

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
        $newAlarmName.setValidity().val('');
    });

    $newAlarmHour.add($newAlarmMin).on('change', () => {
        $newAlarmInvalidFeedback.hide();
        const later = getNewAlarmTime();
        $newAlarmTt.text(moment(later).format('A'));
    });

    $newAlarmAddBtn.on('click', () => {
        $newAlarmInvalidFeedback.hide();
        const now = new Date();
        const later = getNewAlarmTime();
        const name = ($newAlarmName.setValidity().val() || '').trim();
        const minBefore = +$newAlarmMinBefore.setValidity().val();

        if (isNaN(minBefore)) $newAlarmMinBefore.setValidity(false);

        if ($('.is-invalid', $newTimerDlg).length) return;

        if (later > now) {
            const timer = {
                endTime: later,
                name: name,
                minBefore: minBefore
            };
            timers.push(timer);
            createTimerCard(timer);
            saveTimers();
            $newAlarmDlg.modal('hide');
        } else {
            $('.invalid-time', $newAlarmDlg).show();
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
    const $buzzerFileInput = $('#buzzer-sound-file-input', $settingsDlg);
    const $enableSound = $('#enable-sound', $settingsDlg);
    const $enableBgImage = $('#enable-background-image', $settingsDlg);
    const $rotateBgImage = $('#rotate-background-image', $settingsDlg);
    const $settingsSaveBtn = $('#settings-save-btn', $settingsDlg);
    let buzzer = {};
    let buzzerChanged = false;

    const setBuzzerSound = (buzzer) => {
        sounds.$buzzer.attr('src', buzzer.src);
        sounds.$buzzer[0].load();
        $('label[for="buzzer-sound-file-input"]', $settingsDlg).text(buzzer.name);
    };

    $settingsDlg.on('show.bs.modal', () => {
        $('label[for="buzzer-sound-file-input"]', $settingsDlg).text(buzzer && buzzer.name || 'Choose file');
        $enableBgImage.prop('checked', opts.background);
        $rotateBgImage.prop('checked', opts.rotateBg);
        $enableSound.prop('checked', opts.sound);
    });

    $buzzerFileInput.on('change', async () => {
        const file = $buzzerFileInput[0].files[0];
        if (file) {
            $('label[for="buzzer-sound-file-input"]', $settingsDlg).text(file.name);

            const result = await toBase64(file).catch(e => Error(e));
            if (result instanceof Error) {
                console.error('Buzzer input file error: ', result.message);
                return;
            }
            buzzer = {
                name: file.name,
                src: result
            };
            buzzerChanged = true;
            console.debug('Buzzer input file', buzzer);
        }
    });

    $settingsSaveBtn.on('click', () => {
        if (buzzerChanged && buzzer.name && buzzer.src) {
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

    /** Re-hydrate **/
    const rehydrate = (key, fn) => {
        try {
            const savedData = window.localStorage.getItem('simple-timers.' + key);
            const data = JSON.parse(savedData);
            if (data) {
                return fn(data) || true;
            }
        } catch (e) {
            console.error('Failed to rehydrate ' + key, e);
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
        const now = new Date();
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
    });

    if (!rehydrated) {
        $(() => setBackground());
        $attribution.toggle(opts.background);
    }

    /** Main driver **/
    let loopMs = 0;
    setInterval(() => {
        const now = new Date();
        $now.text(moment().format(formats[nowFormat]));

        let hasMinBefore = false;
        let minLeft = 0;
        timers.forEach((timer) => {
            if (timer.ended) return;
            const left = Math.floor((timer.endTime - now) / 1000);

            if (left <= 0) {
                timer.$card.removeClass('timer-danger timer-danger-0 timer-danger-1 timer-danger-2 timer-danger-3')
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

                    const animationInterval = getAnimationInterval(left);
                    timer.$card.removeClass('timer-danger-0 timer-danger-1 timer-danger-2 timer-danger-3')
                        .addClass('timer-danger timer-danger-' + animationInterval);
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