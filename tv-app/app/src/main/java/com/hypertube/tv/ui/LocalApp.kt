package com.hypertube.tv.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.staticCompositionLocalOf
import com.hypertube.tv.AppContainer
import com.hypertube.tv.data.User

val LocalAppContainer = staticCompositionLocalOf<AppContainer> { error("AppContainer not provided") }

@Composable
fun currentUser(): State<User?> = LocalAppContainer.current.session.user.collectAsState()
