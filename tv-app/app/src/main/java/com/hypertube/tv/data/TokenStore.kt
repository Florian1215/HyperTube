package com.hypertube.tv.data

import android.content.Context
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json

// The user is kept with the tokens so the account menu shows the other accounts without a request
@Serializable
data class Account(val user: User, val access: String, val refresh: String? = null)

// Every signed in account, the requests use the tokens of the current one.
// Called from the OkHttp threads by the authenticator, so every access is synchronized
class TokenStore(context: Context, private val json: Json) {
    private val prefs = context.getSharedPreferences("auth", Context.MODE_PRIVATE)
    private val serializer = ListSerializer(Account.serializer())

    // Tokens of an account being added, used until its user is known
    private var pending: Token? = null

    var accounts: List<Account> = load()
        @Synchronized get
        private set

    // null with saved accounts: the guest, who watches without an account
    private var currentId: Int? = if (prefs.getBoolean(GUEST, false)) null else
        prefs.getInt(CURRENT, -1).takeIf { id -> accounts.any { it.user.id == id } } ?: accounts.firstOrNull()?.user?.id

    val current: Account? @Synchronized get() = accounts.find { it.user.id == currentId }

    val access: String? @Synchronized get() = pending?.access ?: current?.access
    val refresh: String? @Synchronized get() = pending.let { if (it != null) it.refresh else current?.refresh }

    @Synchronized
    fun save(access: String, refresh: String?) {
        val token = pending
        if (token != null) {
            pending = Token(access, refresh ?: token.refresh)
            return
        }
        val account = current ?: return
        replace(account.copy(access = access, refresh = refresh ?: account.refresh))
    }

    @Synchronized
    fun begin(token: Token) {
        pending = token
    }

    @Synchronized
    fun cancel() {
        pending = null
    }

    // Stores the pending tokens as the account of the user and switches to it, signing in again replaces the old tokens
    @Synchronized
    fun add(user: User) {
        val token = pending ?: return
        pending = null
        accounts = accounts.filter { it.user.id != user.id } + Account(user, token.access, token.refresh)
        currentId = user.id
        persist()
    }

    @Synchronized
    fun update(user: User) {
        val account = current ?: return
        if (account.user.id == user.id)
            replace(account.copy(user = user))
    }

    @Synchronized
    fun select(id: Int) {
        if (pending == null && accounts.any { it.user.id == id }) {
            currentId = id
            persist()
        }
    }

    // The accounts stay signed in, the requests are sent without tokens
    @Synchronized
    fun selectGuest() {
        if (pending == null) {
            currentId = null
            persist()
        }
    }

    // Removes an account, the next one becomes the current account
    @Synchronized
    fun remove(id: Int) {
        accounts = accounts.filter { it.user.id != id }
        if (currentId == id)
            currentId = accounts.firstOrNull()?.user?.id
        persist()
    }

    // Forgets the tokens in use: the account being added or the current one
    @Synchronized
    fun clear() {
        if (pending != null)
            pending = null
        else
            currentId?.let(::remove)
    }

    private fun replace(account: Account) {
        accounts = accounts.map { if (it.user.id == account.user.id) account else it }
        persist()
    }

    private fun load(): List<Account> = prefs.getString(ACCOUNTS, null)
        ?.let { runCatching { json.decodeFromString(serializer, it) }.getOrNull() }
        .orEmpty()

    private fun persist() {
        prefs.edit()
            .putString(ACCOUNTS, json.encodeToString(serializer, accounts))
            .putInt(CURRENT, currentId ?: -1)
            .putBoolean(GUEST, currentId == null && accounts.isNotEmpty())
            .apply()
    }

    private companion object {
        const val ACCOUNTS = "accounts"
        const val CURRENT = "current"
        const val GUEST = "guest"
    }
}
