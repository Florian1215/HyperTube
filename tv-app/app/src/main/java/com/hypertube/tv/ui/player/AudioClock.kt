package com.hypertube.tv.ui.player

import android.content.Context
import android.media.AudioFormat
import android.media.AudioTimestamp
import android.media.AudioTrack
import android.os.Build
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.audio.AudioSink
import androidx.media3.exoplayer.audio.DefaultAudioSink

// The HDMI output of the SHIELD reports timestamps with about 1 second of latency that is not heard: the player then shows
// the video late, from about 20 seconds after each start (a pause brought it back in sync for a while).
// Without the timestamps, the clock of the player follows the frames played by the audio track.
private val unreliableTimestamps = Build.MANUFACTURER.equals("NVIDIA", ignoreCase = true)

@OptIn(UnstableApi::class)
fun renderersFactory(context: Context): DefaultRenderersFactory = object : DefaultRenderersFactory(context) {
    override fun buildAudioSink(context: Context, enableFloatOutput: Boolean, enableAudioTrackPlaybackParams: Boolean): AudioSink =
        DefaultAudioSink.Builder(context)
            .setEnableFloatOutput(enableFloatOutput)
            .setEnableAudioTrackPlaybackParams(enableAudioTrackPlaybackParams)
            .apply { if (unreliableTimestamps) setAudioTrackProvider { config, attributes, sessionId, _ -> withoutTimestamps(config, attributes, sessionId) } }
            .build()
}

@OptIn(UnstableApi::class)
private fun withoutTimestamps(config: AudioSink.AudioTrackConfig, attributes: androidx.media3.common.AudioAttributes, sessionId: Int): AudioTrack {
    val format = AudioFormat.Builder()
        .setSampleRate(config.sampleRate)
        .setChannelMask(config.channelConfig)
        .setEncoding(config.encoding)
        .build()
    return object : AudioTrack(attributes.audioAttributesV21.audioAttributes, format, config.bufferSize, MODE_STREAM, sessionId) {
        override fun getTimestamp(timestamp: AudioTimestamp): Boolean = false
    }
}
