'use strict';

/** ゆれ識別子（33 bit）を生成する */
function
generateYureId()
{
	const r8 = _ => Math.random() * 8 | 0;
	return [...Array(11)].map(_ => 'YUREyure'[r8()]).join('');
}

// ゆれ識別子を設定する
const yureId = localStorage.getItem('yureId') || generateYureId();
localStorage.setItem('yureId', yureId);
outYureId.value = yureId;

/** 通信用 WebSocket */
const ws = new WebSocket('./');

/** 加速度データバッファ */
const buf = [ ];
/** 画面ロック */
let wakeLock = null;

/** センサイベントハンドラ */
function
devMotionHandler(e)
{
	const { x, y, z } = e.acceleration;
	buf.push({
		yureId,
		x,
		y,
		z,
		t: performance.timeOrigin + performance.now(),
		userAgent: 'web client',
	});
	if (buf.length === 30) {
		ws.send(JSON.stringify(buf));
		buf.length = 0;
	}
}

// フォームを送信しようとしたら WebSocket でサーバにメッセージを送る
form.addEventListener('submit', async e => {
	// form の送信を行わない
	e.preventDefault();

	// ゆれをシェアしようとしている？
	if (e.submitter === btnStart) {
		// iOS の Safari は正気かどうかを確かめてくる
		if (DeviceMotionEvent?.requestPermission) {
			const p = await DeviceMotionEvent.requestPermission();
			if (p !== 'granted')
				return;
		}

		// 画面のスリープをさせないよう試みる
		if ('wakeLock' in navigator) {
			try {
				await navigator.wakeLock.request('screen');
			} catch (err) {
				console.error(`Wake Lock error: ${err.name}, ${err.message}`);
			}
			try {
				if (wakeLock) await wakeLock.release();
			} catch (err) {}
		} else {
			console.warn('Wake Lock API not supported.');
		}
		
		// センサの監視をはじめる
		window.addEventListener('devicemotion', devMotionHandler);
		btnStart.disabled = true;
		btnStop.disabled = false;
	}

	// ゆれをシェアしまいとしている？
	if (e.submitter === btnStop) {
		window.removeEventListener('devicemotion', devMotionHandler);
		btnStart.disabled = false
		btnStop.disabled = true;
		wakeLock.release().then(() => { wakeLock = null; });
	}
});
