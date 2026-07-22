import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns"

const descriptionList = [
  "MV-A MIXING", "Incomer Trafo # 1", "101-11-02", "101-11-11", "101-06-01", "108-A1-LV01", "101-A2-LV01-2", "MCC MV - A", "101-06-02", "101-11-15", "101-11-01", "101-11-06", "101-A1-LV01", " ", "Incomer Trafo # 2", "101-21-23", "101-21-02", "101-21-03", "101-21-04", "101-06-04", "A-DG1-1-1", "DB A2-LV01-1", "101.A2-LV01-1 - Non Industrial", "NEW RAW MATERIAL WAREHOUSE EXPAND", "DB A2-LV01-2", "101.A2-LV01-4  ELV 7", "101-21-18", "101-21-01", "A1-LV01",
  " ", "MV-B Semifinish", "Incomer # 1", "102-07-01", "102-07-02", "102-07-03", "102-07-04", "102-09-01", "102-10-01", "102-13-01", "DB- SF/1", "B-DG1-1-1", "MCC # 6 non industri", "MCC # 5 non industri", "B2 LV01", "B2 LV02", " ", "Incomer # 2", "102-04-01", "102-05-01", "SPARE", "102-01-01", "102-01-03", "102-01-04", "102-01-05", "DB MCC #3", " ", "Incomer # 3", "102-02-01", "Spare",
  " ", "MV-C Curing", "Incomer Trafo # 1", "C1 LV01", "104-C1-LV04", "MCC Vaccum pump", "DB Mech # 3 non industri", "DB Mech # 3 non industri - Musholla", "Curing Line D", "Curing Line E", "Curing Line F", "906-C1-LV01 Non industri", "107-C1-LV01", "DB MCC Curing", "104-C1-LV01", "Lighting External 2", " ", "Incomer Trafo 2", "104-C2-LV01", "204-DG2-1", "907-C2-LV01", "NEW SDP Pirelli Warehouse", "Dinamic Balance machine", "103- Busduct BTU 1", "103- Busduct BTU 2", "103- Busduct BTU 3", "103- Busduct STU 4", "103- Busduct STU 5", "103- Busduct STU 6", "DB Mech # 2 Non industri", "MCC 2 Main Office", "DB- 901-C2-LV01", "DB - GF 902-C2-LV02", "DB- AHU Indoor Test", "ATS MV C", "Bandina M/C",
  " ", "MV-U Utility", "Incomer Trafo # 1", "202-U1-LV01", "U.DG1.1", "Water Cooled Chiller No. 1", "Water Cooled Chiller No. 2", "Air Compressor No.3", " ", "Incomer Trafo # 2", "Compressor No.1", "Air Compressor No.2", "Water Cooled Chiller No. 3", "202-U2-LV01", "U2-LV01", "WWTP", "GUEST HOUSE Non industri", "WTP PUMP", "ATS 2 MV U"
];

const meterOptions = {
  groupA: ["Incoming Main"],
  groupB: ["Incomer Trafo # 1", "101-11-02", "101-11-11", "101-06-01", "108-A1-LV01", "101-A2-LV01-2", "MCC MV - A", "101-06-02", "101-11-15", "101-11-01", "101-11-06", "101-A1-LV01", "Incomer Trafo # 2", "101-21-23", "101-21-02", "101-21-03", "101-21-04", "101-06-04", "A-DG1-1-1", "DB A2-LV01-1", "101.A2-LV01-1 - Non Industrial", "NEW RAW MATERIAL WAREHOUSE EXPAND", "DB A2-LV01-2", "101.A2-LV01-4  ELV 7", "101-21-18", "101-21-01", "A1-LV01"],
  groupC: ["Incomer # 1", "102-07-01", "102-07-02", "102-07-03", "102-07-04", "102-09-01", "102-10-01", "102-13-01", "DB- SF/1", "B-DG1-1-1", "MCC # 6 non industri", "MCC # 5 non industri", "B2 LV01", "B2 LV02", "Incomer # 2", "102-04-01", "102-05-01", "SPARE", "102-01-01", "102-01-03", "102-01-04", "102-01-05", "DB MCC #3", "Incomer # 3", "102-02-01"],
  groupD: ["Incomer Trafo # 1", "C1 LV01", "104-C1-LV04", "MCC Vaccum pump", "DB Mech # 3 non industri", "DB Mech # 3 non industri - Musholla", "Curing Line D", "Curing Line E", "Curing Line F", "906-C1-LV01 Non industri", "107-C1-LV01", "DB MCC Curing", "104-C1-LV01", "Lighting External 2", "Incomer Trafo 2", "104-C2-LV01", "204-DG2-1", "907-C2-LV01", "NEW SDP Pirelli Warehouse", "Dinamic Balance machine", "103- Busduct BTU 1", "103- Busduct BTU 2", "103- Busduct BTU 3", "103- Busduct STU 4", "103- Busduct STU 5", "103- Busduct STU 6", "DB Mech # 2 Non industri", "MCC 2 Main Office", "DB- 901-C2-LV01", "DB - GF 902-C2-LV02", "DB- AHU Indoor Test", "ATS MV C", "Bandina M/C"],
  groupE: ["Incomer Trafo # 1", "202-U1-LV01", "U.DG1.1", "Water Cooled Chiller No. 1", "Water Cooled Chiller No. 2", "Air Compressor No.3", "Incomer Trafo # 2", "Compressor No.1", "Air Compressor No.2", "Water Cooled Chiller No. 3", "202-U2-LV01", "U2-LV01", "WWTP", "GUEST HOUSE Non industri", "WTP PUMP", "ATS 2 MV U"]
}

const formatGroupName = (group) => {
  switch (group) {
    case "groupA": return "MV-I (Incoming)"
    case "groupB": return "MV-A (Mixing)"
    case "groupC": return "MV-B (Semifinishing)"
    case "groupD": return "MV-C (Curing)"
    case "groupE": return "MV-U (Utility)"
    default: return group
  }
}

export default function DataInputPage() {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    meterGroup: "",
    meterDetail: "",
    kWh: "",
    kVarh: "",
    timestamp: new Date().toISOString().slice(0, 10), // hanya tanggal
    shift: "", // tambahkan shift
  })  
  const [errors, setErrors] = useState({})
  const [dataList, setDataList] = useState([])
  const [editIndex, setEditIndex] = useState(null)
  const [confirmAction, setConfirmAction] = useState({ type: "", index: null })
  const [filter, setFilter] = useState({ search: "", from: "", to: "" })
  const [page, setPage] = useState(1)
  const itemsPerPage = 5
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  // Saat load data dari localStorage, tambah ID unik untuk tiap item
  useEffect(() => {
    const existing = JSON.parse(localStorage.getItem("energyDataLV") || "[]")
    setDataList(existing)
  }, [])

  const handleSubmit = (e) => {
  e.preventDefault();
  const isEdit = editIndex !== null;

  const newErrors = {};
  if (!formData.meterGroup) newErrors.meterGroup = "Meter group is required.";
  if (!formData.meterDetail) newErrors.meterDetail = "Meter detail is required.";
  if (!formData.kWh) newErrors.kWh = "kWh is required.";
  if (!formData.kVarh) newErrors.kVarh = "kVarh is required.";
  if (!formData.timestamp) newErrors.timestamp = "Timestamp is required.";
  if (!formData.shift) newErrors.shift = "Shift is required.";

  const chronoVal = (timestamp, shift) => {
    const shiftOrder = { "1": 1, "2": 2, "3": 3 };
    const baseTime = new Date(timestamp).getTime();
    return baseTime + (shiftOrder[shift] || 0) * 1000;
  };

  const chronoNow = chronoVal(formData.timestamp, formData.shift);

  // Cek duplikat jika tambah data baru
  if (!isEdit) {
  const duplicate = dataList.find(item =>
    item.timestamp === formData.timestamp &&
    item.shift === formData.shift &&
    item.meterGroup === formData.meterGroup &&
    item.meterDetail === formData.meterDetail
  );

  if (duplicate) {
    setShowDuplicateDialog(true);
    return;
  }
}

  const related = dataList
    .filter((item, idx) =>
      item.meterGroup === formData.meterGroup &&
      item.meterDetail === formData.meterDetail &&
      (!isEdit || item._id !== dataList[editIndex]._id)
    )
    .sort((a, b) => chronoVal(a.timestamp, a.shift) - chronoVal(b.timestamp, b.shift));

  let prev = null;
  let next = null;

  for (let i = 0; i < related.length; i++) {
    const val = chronoVal(related[i].timestamp, related[i].shift);
    if (val < chronoNow) prev = related[i];
    if (val > chronoNow) {
      next = related[i];
      break;
    }
  }

  const kWh = parseFloat(formData.kWh);
  const kVarh = parseFloat(formData.kVarh);

  if (isNaN(kWh)) newErrors.kWh = "kWh is required.";
  if (isNaN(kVarh)) newErrors.kVarh = "kVarh is required.";

  if (prev) {
    if (kWh <= parseFloat(prev.kWh)) {
      newErrors.kWh = `kWh must be > previous (${prev.kWh}) at ${prev.timestamp} shift ${prev.shift}`;
    }
    if (kVarh <= parseFloat(prev.kVarh)) {
      newErrors.kVarh = `kVarh must be > previous (${prev.kVarh}) at ${prev.timestamp} shift ${prev.shift}`;
    }
  }

  if (next) {
    if (kWh >= parseFloat(next.kWh)) {
      newErrors.kWh = `kWh must be < next (${next.kWh}) at ${next.timestamp} shift ${next.shift}`;
    }
    if (kVarh >= parseFloat(next.kVarh)) {
      newErrors.kVarh = `kVarh must be < next (${next.kVarh}) at ${next.timestamp} shift ${next.shift}`;
    }
  }

  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    toast({
      title: "Validation failed",
      description: "Please check your input values.",
      variant: "destructive"
    });
    return;
  }

  const newData = {
    ...formData,
    _id: isEdit ? dataList[editIndex]._id : Date.now(),
  };

  const updatedList = isEdit
    ? dataList.map((d, i) => (i === editIndex ? newData : d))
    : [...dataList, newData];

  localStorage.setItem("energyDataLV", JSON.stringify(updatedList));
  setDataList(updatedList);
  setFormData({
    meterGroup: "",
    meterDetail: "",
    kWh: "",
    kVarh: "",
    timestamp: new Date().toISOString().slice(0, 10),
    shift: ""
  });
  setErrors({});
  setEditIndex(null);

  toast({
    title: "Success",
    description: "Data saved successfully."
  });
};

  const handleDelete = (id) => setConfirmAction({ type: "delete", index: id })
  const handleEdit = (id) => setConfirmAction({ type: "edit", index: id })

  const confirmDelete = () => {
    const updated = dataList.filter((d) => d._id !== confirmAction.index) // Filter berdasarkan _id
    setDataList(updated)
    localStorage.setItem("energyDataLV", JSON.stringify(updated))
    setConfirmAction({ type: "", index: null })
    toast({ title: "Deleted", description: "Data has been deleted." })
  }

  const confirmEdit = () => {
    setFormData(dataList.find(d => d._id === confirmAction.index)) // Ambil data berdasarkan _id
    setEditIndex(dataList.findIndex(d => d._id === confirmAction.index))
    setConfirmAction({ type: "", index: null })
  }

  const filteredData = dataList
    .filter(d => {
      const matchSearch = 
  (formatGroupName(d.meterGroup ?? '').toLowerCase().includes(filter.search.toLowerCase()) ||
   (d.meterDetail ?? '').toLowerCase().includes(filter.search.toLowerCase()))
      const matchFrom = filter.from ? new Date(d.timestamp) >= new Date(filter.from) : true
      const matchTo = filter.to ? new Date(d.timestamp) <= new Date(filter.to) : true
      return matchSearch && matchFrom && matchTo
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  return (
    <div className="space-y-6">
      {/* Form Input */}
      <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-lg bg-white shadow">
        <h2 className="text-xl font-bold">{editIndex !== null ? "Edit Low Voltage Data" : "Input Low Voltage Data"}</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="col-span-1">
            <Label>Shift</Label>
            <Select
              value={formData.shift}
              onValueChange={v => {
                setFormData({ ...formData, shift: v })
                setErrors({ ...errors, shift: undefined })
              }}
            >
              <SelectTrigger className={errors.shift ? "border-red-500" : ""}>
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Shift 1</SelectItem>
                <SelectItem value="2">Shift 2</SelectItem>
                <SelectItem value="3">Shift 3</SelectItem>
              </SelectContent>
            </Select>
            {errors.shift && <p className="text-red-500 text-xs mt-1">{errors.shift}</p>}
          </div>

          <div className="col-span-1">
            <Label>Date</Label>
            <Input
              type="date"
              value={formData.timestamp}
              onChange={e => {
                setFormData({ ...formData, timestamp: e.target.value })
                setErrors({ ...errors, timestamp: undefined })
              }}
              className={errors.timestamp ? "border-red-500" : ""}
            />
            {errors.timestamp && <p className="text-red-500 text-xs mt-1">{errors.timestamp}</p>}
          </div>

          <div>
            <Label>Meter Group</Label>
            <Select
              value={formData.meterGroup}
              onValueChange={v => {
                setFormData({ ...formData, meterGroup: v, meterDetail: "" })
                setErrors({ ...errors, meterGroup: undefined })
              }}
            >
              <SelectTrigger className={errors.meterGroup ? "border-red-500" : ""}>
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(meterOptions).map(k => (
                  <SelectItem key={k} value={k}>
                    {formatGroupName(k)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.meterGroup && <p className="text-red-500 text-xs mt-1">{errors.meterGroup}</p>}
          </div>

          {formData.meterGroup && (
            <div>
              <Label>Meter Detail</Label>
              <Select
                value={formData.meterDetail}
                onValueChange={v => {
                  setFormData({ ...formData, meterDetail: v })
                  setErrors({ ...errors, meterDetail: undefined })
                }}
              >
                <SelectTrigger className={errors.meterDetail ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select detail" />
                </SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto">
                  {meterOptions[formData.meterGroup].map((d, i) => (
                    <SelectItem key={i} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.meterDetail && <p className="text-red-500 text-xs mt-1">{errors.meterDetail}</p>}
            </div>
          )}

            <div>
              <Label>kWh</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={formData.kWh}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value)) {
                    setFormData({ ...formData, kWh: value });
                    setErrors({ ...errors, kWh: undefined });
                  } else {
                    toast({
                      title: "Input Tidak Valid",
                      description: "Hanya angka (0-9) yang diperbolehkan. Tidak boleh huruf, titik, koma, atau simbol lain.",
                      variant: "destructive",
                    });
                  }
                }}
                className={errors.kWh ? "border-red-500" : ""}
              />
              {errors.kWh && <p className="text-red-500 text-xs mt-1">{errors.kWh}</p>}
            </div>

            <div>
              <Label>kVarh</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={formData.kVarh}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value)) {
                    setFormData({ ...formData, kVarh: value });
                    setErrors({ ...errors, kVarh: undefined });
                  } else {
                    toast({
                      title: "Input Tidak Valid",
                      description: "Hanya angka (0-9) yang diperbolehkan. Tidak boleh huruf, titik, koma, atau simbol lain.",
                      variant: "destructive",
                    });
                  }
                }}
                className={errors.kVarh ? "border-red-500" : ""}
              />
              {errors.kVarh && <p className="text-red-500 text-xs mt-1">{errors.kVarh}</p>}
            </div>
        </div>

        <Button type="submit" className="w-full">
          {editIndex !== null ? "Update Data" : "Save Data"}
        </Button>

        <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Duplicate Entry</DialogTitle>
            </DialogHeader>
            <p>
              Data with the same combination of <strong>Date, Shift, Group, and Meter Detail</strong> already exists.
              Please change your entry to avoid duplication.
            </p>
            <DialogFooter>
              <Button onClick={() => setShowDuplicateDialog(false)}>OK</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </form>

      {/* Tabel data */}
      <div className="space-y-4 p-6 rounded-lg bg-white shadow">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <h2 className="text-xl font-bold">Low Voltage Data Record</h2>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Search group/detail..." value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} />
            <Input type="date" value={filter.from} onChange={e => setFilter({ ...filter, from: e.target.value })} />
            <Input type="date" value={filter.to} onChange={e => setFilter({ ...filter, to: e.target.value })} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">Timestamp</th>
              <th className="px-4 py-2 text-left">Shift</th>
              <th className="px-4 py-2 text-left">Meter Group</th>
              <th className="px-4 py-2 text-left">Meter Sub</th>
              <th className="px-4 py-2 text-left">Stand kWh</th>
              <th className="px-4 py-2 text-left">Stand kVarh</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item) => (
              <tr key={item._id}>
                <td className="px-4 py-2">{format(new Date(item.timestamp), "yyyy-MM-dd")}</td>
                <td className="px-4 py-2">{item.shift}</td>
                <td className="px-4 py-2">{formatGroupName(item.meterGroup)}</td>
                <td className="px-4 py-2">{item.meterDetail}</td>
                <td className="px-4 py-2">{item.kWh}</td>
                <td className="px-4 py-2">{item.kVarh}</td>
                <td className="px-4 py-2">
                  <Button onClick={() => handleEdit(item._id)} variant="outline">Edit</Button>
                  <Button onClick={() => handleDelete(item._id)} variant="destructive">Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div className="flex justify-between mt-4">
          <div>
            Showing {paginatedData.length} of {filteredData.length} records
          </div>
          <div className="flex gap-2">
            <Button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmAction.type !== ""} onOpenChange={() => setConfirmAction({ type: "", index: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            {confirmAction.type === "delete" ? (
              <>
                <Button onClick={confirmDelete} variant="destructive">Delete</Button>
                <Button onClick={() => setConfirmAction({ type: "", index: null })}>Cancel</Button>
              </>
            ) : (
              <>
                <Button onClick={confirmEdit}>Edit</Button>
                <Button onClick={() => setConfirmAction({ type: "", index: null })}>Cancel</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
