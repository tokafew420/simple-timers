(function (window) {
    /** Vars */
    const opts = {
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

    $.fn.setValidity = function (isValid, message) {
        return this.each(function () {
            const $this = $(this);
            const $inputGrp = $this.closest('.input-group');
            const $feedback = $inputGrp.siblings('.invalid-feedback');

            $this.add($inputGrp).toggleClass('is-invalid', isValid === false);
            message && $feedback.text(message);
        });
    };

    const saveTimers = () => {
        const now = new Date();
        window.localStorage.setItem('simple-timers.timers', JSON.stringify({
            opts: opts,
            timers: timers.filter((timer) => timer.endTime >= now)
                .map((timer) => {
                    return {
                        endTime: timer.endTime.getTime(),
                        minBefore: timer.minBefore
                    };
                })
        }));
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
        $('.timer-until', $card).text(moment(timer.endTime).format('hh:mm A'));

        $card.appendTo($timers);
        timer.$card = $card;
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
    const $newTimerHour = $('#new-timer-hour-input', $newTimerDlg);
    const $newTimerMin = $('#new-timer-minute-input', $newTimerDlg);
    const $newTimerSec = $('#new-timer-second-input', $newTimerDlg);
    const $newTimerMinBefore = $('#new-timer-minutes-before-input', $newTimerDlg);
    const $newTimerAddBtn = $('#new-timer-add-btn', $newTimerDlg);

    $newTimerDlg.modal({
        backdrop: 'static',
        keyboard: false,
        focus: true,
        show: false
    }).on('show.bs.modal', () => {
        $newTimerHour.setValidity().val('');
        $newTimerMin.setValidity().val('');
        $newTimerSec.setValidity().val('');
        $newTimerMinBefore.val(opts.minBefore);
    });

    $newTimerAddBtn.on('click', () => {
        const hours = +$newTimerHour.setValidity().val();
        const minutes = +$newTimerMin.setValidity().val();
        const seconds = +$newTimerSec.setValidity().val();

        if (isNaN(hours)) $newTimerHour.setValidity(false);
        if (isNaN(minutes)) $newTimerMin.setValidity(false);
        if (isNaN(seconds)) $newTimerSec.setValidity(false);

        if ($('.is-invalid', $newTimerDlg).length) return;

        const later = new Date();
        later.setHours(later.getHours() + hours);
        later.setMinutes(later.getMinutes() + minutes)
        later.setSeconds(later.getSeconds() + seconds, 0);

        const timer = {
            endTime: later,
            minBefore: +$newTimerMinBefore.val() || 0
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
    const $newAlarmTt = $('#time-tt-lbl', $newAlarmDlg);
    const $newAlarmMinBefore = $('#new-alarm-minutes-before-input', $newAlarmDlg);
    const $newAlarmAddBtn = $('#new-alarm-add-btn', $newAlarmDlg);

    const getNewAlarmTime = () => {
        const hour = +$newAlarmHour.val();
        const minute = +$newAlarmMin.val();
        const later = new Date();
        later.setHours(hour, minute, 0, 0);

        return later;
    };

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
        $newAlarmMinBefore.val(opts.minBefore);
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

        if (later > now) {
            const timer = {
                endTime: later,
                minBefore: +$newAlarmMinBefore.val() || 0
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
    const $settingsSaveBtn = $('#settings-save-btn', $settingsDlg);
    let buzzer = {};
    let buzzerChanged = false;

    const setBuzzerSound = (buzzer) => {
        $('source', sounds.$buzzer).attr('src', buzzer.src);
        sounds.$buzzer[0].load();
        $('label[for="buzzer-sound-file-input"]', $settingsDlg).text(buzzer.name);
    };

    $settingsDlg.on('show.bs.modal', () => $('label[for="buzzer-sound-file-input"]', $settingsDlg).text(buzzer && buzzer.name || 'Choose file'));

    $buzzerFileInput.on('change', async () => {
        const file = $buzzerFileInput[0].files[0];
        if (file) {
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
            window.localStorage.setItem('simple-timers.buzzer', JSON.stringify(buzzer));
            setBuzzerSound(buzzer);
            buzzerChanged = false;
        }
        $settingsDlg.modal('hide');
    });

    /** Re-hydrate **/
    const rehydrate = (key, fn) => {
        try {
            const savedData = window.localStorage.getItem(key);
            const data = JSON.parse(savedData);
            if (data) {
                return fn(data);
            }
        } catch (e) {
            console.error('Failed to rehydrate ' + key, e);
        }
    };

    rehydrate('simple-timers.timers', (data) => {
        opts.sound = opts.sound;
        opts.minBefore = opts.minBefore;

        const now = new Date();
        timers = data.timers.map((timer) => {
            return {
                endTime: new Date(timer.endTime),
                minBefore: timer.minBefore
            };
        }).filter((timer) => timer.endTime >= now);

        timers.forEach((timer) => createTimerCard(timer));
    });

    rehydrate('simple-timers.buzzer', (data) => {
        setBuzzerSound(data)
        buzzer = data;
    });

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