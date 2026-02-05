"use client";

interface StatsCardProps {
    label: string;
    value: string | number;
    icon: string;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
}

export function StatsCard({ label, value, icon, trend, trendValue }: StatsCardProps) {
    return (
        <div className="stat-card glow-hover">
            <div className="text-4xl mb-3">{icon}</div>
            <div className="text-3xl font-bold text-white mb-1">{value}</div>
            <div className="text-sm text-gray-400 mb-2">{label}</div>
            {trend && trendValue && (
                <div className={`text-xs ${trend === "up" ? "text-green-400" :
                        trend === "down" ? "text-red-400" :
                            "text-gray-500"
                    }`}>
                    {trend === "up" && "↑"}
                    {trend === "down" && "↓"}
                    {trendValue}
                </div>
            )}
        </div>
    );
}

interface NetworkStatsProps {
    totalProfiles: number;
    totalPosts: number;
    totalFollows: number;
    totalLikes: number;
    isLive?: boolean;
}

export function NetworkStats({
    totalProfiles,
    totalPosts,
    totalFollows,
    totalLikes,
    isLive = false
}: NetworkStatsProps) {
    return (
        <div className="space-y-4">
            {isLive && (
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-sm text-gray-400">Live Stats</span>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard
                    icon="👥"
                    value={totalProfiles.toLocaleString()}
                    label="Profiles"
                    trend="up"
                    trendValue="+12 today"
                />
                <StatsCard
                    icon="📝"
                    value={totalPosts.toLocaleString()}
                    label="Posts"
                    trend="up"
                    trendValue="+48 today"
                />
                <StatsCard
                    icon="🔗"
                    value={totalFollows.toLocaleString()}
                    label="Follows"
                    trend="up"
                    trendValue="+23 today"
                />
                <StatsCard
                    icon="❤️"
                    value={totalLikes.toLocaleString()}
                    label="Likes"
                    trend="up"
                    trendValue="+156 today"
                />
            </div>
        </div>
    );
}
