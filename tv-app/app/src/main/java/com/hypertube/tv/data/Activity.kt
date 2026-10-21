package com.hypertube.tv.data

fun activityKey(activity: Media) = "${activity.type}-${activity.id}" + (activity.episode?.let { "-${it.id}" } ?: "")

private fun mediaKey(activity: Media) = "${activity.type}-${activity.id}"

// Port of groupActivities (src/components/FriendsActivity.tsx): the episodes of a series
// watched by exactly the same friends end up in the same stack
fun groupActivities(activities: List<Media>): List<List<Media>> {
    val episodes = LinkedHashMap<String, MutableList<Media>>()
    activities.forEach { activity ->
        val episode = episodes.getOrPut(activityKey(activity)) { mutableListOf() }
        if (episode.none { it.user?.id == activity.user?.id })
            episode += activity
    }

    val stacks = LinkedHashMap<String, MutableList<Media>>()
    episodes.values.forEach { episode ->
        val users = episode.mapNotNull { it.user?.id }.sorted().joinToString(",")
        stacks.getOrPut("${mediaKey(episode.first())}/$users") { mutableListOf() } += episode
    }
    return stacks.values.toList()
}
