import React, { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import EnergyConsumptionChart from "@/components/Chart/EnergyConsumptionChart"
import CostChangeCard from "@/components/Chart/CostChangeCard"

const Performance = () => {
  const [timeframe, setTimeframe] = useState("daily")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <EnergyConsumptionChart timeframe={timeframe} />
      <CostChangeCard/>
    </div>
  )
}

export default Performance