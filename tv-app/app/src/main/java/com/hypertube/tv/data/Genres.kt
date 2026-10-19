package com.hypertube.tv.data

data class Genre(val id: Int, val name: String)

// Same lists as the website (src/types/genre.ts)
private val GENRES = mapOf(
    "fr" to listOf(
        28 to "Action", 12 to "Aventure", 16 to "Animation", 35 to "Comédie", 80 to "Crime", 99 to "Documentaire",
        18 to "Drame", 10751 to "Familial", 14 to "Fantastique", 36 to "Histoire", 27 to "Horreur", 10402 to "Musique",
        9648 to "Mystère", 10749 to "Romance", 878 to "Science-Fiction", 10770 to "Téléfilm", 53 to "Thriller",
        10752 to "Guerre", 37 to "Western",
    ),
    "en" to listOf(
        28 to "Action", 12 to "Adventure", 16 to "Animation", 35 to "Comedy", 80 to "Crime", 99 to "Documentary",
        18 to "Drama", 10751 to "Family", 14 to "Fantasy", 36 to "History", 27 to "Horror", 10402 to "Music",
        9648 to "Mystery", 10749 to "Romance", 878 to "Science Fiction", 10770 to "TV Movie", 53 to "Thriller",
        10752 to "War", 37 to "Western",
    ),
    "de" to listOf(
        28 to "Action", 12 to "Abenteuer", 16 to "Animation", 35 to "Komödie", 80 to "Krimi", 99 to "Dokumentarfilm",
        18 to "Drama", 10751 to "Familie", 14 to "Fantasy", 36 to "Historie", 27 to "Horror", 10402 to "Musik",
        9648 to "Mystery", 10749 to "Liebesfilm", 878 to "Science Fiction", 10770 to "TV-Film", 53 to "Thriller",
        10752 to "Kriegsfilm", 37 to "Western",
    ),
)

fun genres(): List<Genre> = GENRES.getValue(currentLanguage()).map { (id, name) -> Genre(id, name) }

fun genresOf(ids: List<Int>): List<Genre> = genres().filter { it.id in ids }
