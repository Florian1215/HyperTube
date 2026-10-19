package com.hypertube.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Text
import com.hypertube.tv.ui.theme.HtColors
import com.hypertube.tv.ui.theme.HtText
import com.hypertube.tv.ui.theme.LocalAccent

// Text field opened with the OK button of the remote, the system keyboard does the typing
@Composable
fun HtTextField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    style: TextStyle = HtText.Body,
    singleLine: Boolean = true,
    imeAction: ImeAction = ImeAction.Done,
    onSubmit: () -> Unit = {},
    underline: Boolean = false,
) {
    var focused by remember { mutableStateOf(false) }
    val accent = LocalAccent.current
    val borderColor = if (focused) accent else HtColors.White
    val textStyle = style.copy(color = HtColors.White)

    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        singleLine = singleLine,
        textStyle = textStyle,
        cursorBrush = SolidColor(accent),
        keyboardOptions = KeyboardOptions(imeAction = imeAction),
        keyboardActions = KeyboardActions(onDone = { onSubmit() }, onSearch = { onSubmit() }, onSend = { onSubmit() }),
        modifier = modifier.onFocusChanged { focused = it.isFocused },
        decorationBox = { inner ->
            val content: @Composable () -> Unit = {
                Box {
                    if (value.isEmpty())
                        Text(placeholder, style = textStyle.copy(color = HtColors.Gray), maxLines = 1)
                    inner()
                }
            }
            if (underline)
                Column {
                    content()
                    Box(Modifier.padding(top = 4.dp).fillMaxWidth().height(if (focused) 3.dp else 1.dp).background(borderColor))
                }
            else
                Box(Modifier.background(HtColors.Black).border(if (focused) 3.dp else 1.dp, borderColor).padding(horizontal = 16.dp, vertical = 12.dp)) {
                    content()
                }
        },
    )
}
