import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, ChevronDown, Swords, CalendarClock } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import PageSeo from "@/components/seo/PageSeo";

interface TeamSlot {
  name: string;
  isTBD: boolean;
}

interface Group {
  letter: string;
  teams: TeamSlot[];
}

const groups: Group[] = [
  { letter: "A", teams: [
    { name: "Mexico", isTBD: false },
    { name: "South Korea", isTBD: false },
    { name: "South Africa", isTBD: false },
    { name: "UEFA Path D Winner", isTBD: true },
  ]},
  { letter: "B", teams: [
    { name: "Canada", isTBD: false },
    { name: "Switzerland", isTBD: false },
    { name: "Qatar", isTBD: false },
    { name: "UEFA Path A Winner", isTBD: true },
  ]},
  { letter: "C", teams: [
    { name: "Brazil", isTBD: false },
    { name: "Morocco", isTBD: false },
    { name: "Scotland", isTBD: false },
    { name: "Haiti", isTBD: false },
  ]},
  { letter: "D", teams: [
    { name: "USA", isTBD: false },
    { name: "Paraguay", isTBD: false },
    { name: "Australia", isTBD: false },
    { name: "UEFA Path C Winner", isTBD: true },
  ]},
  { letter: "E", teams: [
    { name: "Germany", isTBD: false },
    { name: "Ivory Coast", isTBD: false },
    { name: "Ecuador", isTBD: false },
    { name: "Curaçao", isTBD: false },
  ]},
  { letter: "F", teams: [
    { name: "Netherlands", isTBD: false },
    { name: "Japan", isTBD: false },
    { name: "Tunisia", isTBD: false },
    { name: "UEFA Path B Winner", isTBD: true },
  ]},
  { letter: "G", teams: [
    { name: "Belgium", isTBD: false },
    { name: "Egypt", isTBD: false },
    { name: "Iran", isTBD: false },
    { name: "New Zealand", isTBD: false },
  ]},
  { letter: "H", teams: [
    { name: "Spain", isTBD: false },
    { name: "Uruguay", isTBD: false },
    { name: "Saudi Arabia", isTBD: false },
    { name: "Cape Verde", isTBD: false },
  ]},
  { letter: "I", teams: [
    { name: "France", isTBD: false },
    { name: "Senegal", isTBD: false },
    { name: "Norway", isTBD: false },
    { name: "Inter-Playoff 2 Winner", isTBD: true },
  ]},
  { letter: "J", teams: [
    { name: "Argentina", isTBD: false },
    { name: "Chile", isTBD: false },
    { name: "Nigeria", isTBD: false },
    { name: "Algeria", isTBD: false },
  ]},
  { letter: "K", teams: [
    { name: "Portugal", isTBD: false },
    { name: "Colombia", isTBD: false },
    { name: "Uzbekistan", isTBD: false },
    { name: "Inter-Playoff 1 Winner", isTBD: true },
  ]},
  { letter: "L", teams: [
    { name: "England", isTBD: false },
    { name: "Croatia", isTBD: false },
    { name: "Ghana", isTBD: false },
    { name: "Panama", isTBD: false },
  ]},
];

const WorldCupPredictor = () => {
  return (
    <div className="min-h-screen bg-[hsl(150,20%,8%)] text-white">
      <PageSeo
        title="World Cup 2026 Predictor | Sports Trivia Games"
        description="Explore all 12 groups for the FIFA World Cup 2026 hosted in USA, Mexico & Canada."
        path="/world-cup-predictor"
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-[hsl(45,90%,55%)]" />
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[hsl(45,90%,55%)]">
              World Cup 2026 Predictor
            </h1>
            <Trophy className="w-8 h-8 text-[hsl(45,90%,55%)]" />
          </div>
          <p className="text-[hsl(150,15%,60%)] text-sm sm:text-base">
            USA 🇺🇸 · Mexico 🇲🇽 · Canada 🇨🇦 — 48 Teams · 12 Groups
          </p>
        </div>

        {/* Playoff Slots Panel */}
        <PlayoffSlotsPanel />

        {/* Group Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groups.map((group) => (
            <Card
              key={group.letter}
              className="bg-[hsl(150,15%,12%)] border-[hsl(150,20%,20%)] shadow-lg"
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-lg font-bold text-[hsl(45,90%,55%)] tracking-wide">
                  Group {group.letter}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <ul className="space-y-2">
                  {group.teams.map((team, idx) => (
                    <li
                      key={idx}
                      className={`flex items-center justify-between rounded-md px-3 py-2 ${
                        team.isTBD
                          ? "bg-[hsl(150,10%,16%)]"
                          : "bg-[hsl(150,12%,18%)]"
                      }`}
                    >
                      <span
                        className={
                          team.isTBD
                            ? "italic text-[hsl(0,0%,55%)] text-sm"
                            : "font-bold text-white text-sm"
                        }
                      >
                        {team.name}
                      </span>
                      {team.isTBD && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-[hsl(0,0%,40%)] text-[hsl(0,0%,50%)] px-1.5 py-0"
                        >
                          TBD
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorldCupPredictor;
