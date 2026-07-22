import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Struktur data untuk dropdown bertingkat
const meterOptions = {
  "20kV GARDU PLN": [
    { label: "Stand kWh LWBP-1", type: "kWh" },
    { label: "Stand kWh LWBP-2", type: "kWh" },
    { label: "Stand kWh WBP", type: "kWh" },
    { label: "Stand kVARh PLN", type: "kVARh" },
  ],
  "20kV MV-I Nat Grid Incomer": [
    { label: "Stand kWh", type: "Stand kWh" },
    { label: "Stand kVARh", type: "Stand kVARh" },
  ],
  "Reading @Out Going Trafo": [
    {
      label: "MV-A TRAFO 1",
      children: [
        { type: "Stand kWh" },
        { type: "Stand kVARh" },
      ],
    },
    {
      label: "MV-A TRAFO 2",
      children: [
        { type: "Stand kWh" },
        { type: "Stand kVARh" },
      ],
    },
    {
      label: "MV-A TRAFO 3",
      children: [
        { type: "Stand kWh" },
        { type: "Stand kVARh" },
      ],
    },
    {
      label: "MV-A TRAFO 4",
      children: [
        { type: "Stand kWh" },
        { type: "Stand kVARh" },
      ],
    },
    {
      label: "MV-B TRAFO 1",
      children: [
        { type: "Stand kWh" },
        { type: "Stand kVARh" },
      ],
    },
    {
      label: "MV-B TRAFO 2",
      children: [
        { type: "Stand kWh" },
        { type: "Stand kVARh" },
      ],
    },
    {
      label: "MV-B TRAFO 3",
      children: [
        { type: "Stand kWh" },
        { type: "Stand kVARh" },
      ],
    },
    {
      label: "MV-B TRAFO 4",
      children: [
        { type: "Stand kWh" },
        { type: "Stand kVARh" },
      ],
    },
    {
      label: "MV-C TRAFO 1",
      children: [
        { type: "Stand kWh" },
        { type: "Stand kVARh" },
      ],
    },
    {
      label: "MV-C TRAFO 2",
      children: [
        { type: "Stand kWh" },
        { type: "Stand kVARh" },
      ],
    },
    {
      label: "MV-U TRAFO 1",
      children: [
        { type: "Stand kWh" },
        { type: "Stand kVARh" },
      ],
    },
    {
      label: "MV-U TRAFO 2",
      children: [
        { type: "Stand kWh" },
        { type: "Stand kVARh" },
      ],
    },
  ],
};

export default function DataInputMVPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    shift: "",
    timestamp: new Date().toISOString().slice(0, 10),
    meterGroup: "",
    meterSub: "",
    readings: {
      "Stand kWh LWBP-1": "",
      "Stand kWh LWBP-2": "",
      "Stand kWh WBP": "",
      "Stand kVARh PLN": "",
    },
  });
  const [errors, setErrors] = useState({});
  const [dataList, setDataList] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [filter, setFilter] = useState({ search: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState({ type: "", index: null });
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const itemsPerPage = 3;

  useEffect(() => {
    const existing = JSON.parse(localStorage.getItem("energyDataMV") || "[]");
    setDataList(existing);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const isEdit = editIndex !== null;

    const newErrors = {};
    if (!formData.shift) newErrors.shift = "Shift is required.";
    if (!formData.timestamp) newErrors.timestamp = "Date is required.";
    if (!formData.meterGroup) newErrors.meterGroup = "Meter group is required.";

    const selectedGroup = meterOptions[formData.meterGroup];
    const isGrouped = Array.isArray(selectedGroup) && selectedGroup[0]?.children;
    const selectedSub = isGrouped ? selectedGroup.find(item => item.label === formData.meterSub) : null;

    if (isGrouped && !formData.meterSub) {
      newErrors.meterSub = "Meter Sub is required.";
    }

    // Generate list of reading labels dynamically
    let readingLabels = [];
    if (isGrouped && selectedSub) {
      readingLabels = selectedSub.children.map((input) => `${formData.meterSub} - ${input.type}`);
    } else if (!isGrouped && selectedGroup) {
      readingLabels = selectedGroup.map((input) => input.label);
    }

    // Helper: waktu kronologis berbasis timestamp + shift
  const getChronoValue = (timestamp, shift) => {
    const shiftOrder = { "Shift 1": 1, "Shift 2": 2, "Shift 3": 3 };
    const baseTime = new Date(timestamp).getTime();
    return baseTime + (shiftOrder[shift] || 0) * 1000;
  };

  const chronoNow = getChronoValue(formData.timestamp, formData.shift);

    const originalData = isEdit ? dataList[editIndex] : null;

    // **Pengecekan duplikat**: Jika belum edit, cek duplikat sebelum lanjut ke validasi
    if (!isEdit) {
  // Validasi duplikat jika bukan edit
  const duplicate = dataList.find(item =>
    item.timestamp === formData.timestamp &&
    item.shift === formData.shift &&
    item.meterGroup === formData.meterGroup &&
    item.meterSub === formData.meterSub
  );
  if (duplicate) {
    setShowDuplicateDialog(true);
    return;
  }
}

// Untuk validasi kronologis, abaikan entri yang sedang diedit
const relatedEntries = dataList
  .filter((item, idx) =>
    item.meterGroup === formData.meterGroup &&
    item.meterSub === formData.meterSub &&
    (!isEdit || idx !== editIndex) // abaikan entri yang sedang diedit
  )
  .sort((a, b) =>
    getChronoValue(a.timestamp, a.shift) - getChronoValue(b.timestamp, b.shift)
  );

// Cari entri sebelum dan sesudah
let prevEntry = null;
let nextEntry = null;
for (let i = 0; i < relatedEntries.length; i++) {
  const chrono = getChronoValue(relatedEntries[i].timestamp, relatedEntries[i].shift);
  if (chrono < chronoNow) prevEntry = relatedEntries[i];
  if (chrono > chronoNow) {
    nextEntry = relatedEntries[i];
    break;
  }
}

// Validasi tiap label
readingLabels.forEach((label) => {
  const rawValue = formData.readings[label];
  const newValue = parseFloat(rawValue);

  if (!rawValue) {
    newErrors[`readings.${label}`] = `${label} is required.`;
    return;
  }

  if (isNaN(newValue)) {
    newErrors[`readings.${label}`] = `${label} must be a number.`;
    return;
  }

  // Harus lebih besar dari entri sebelumnya
  if (prevEntry) {
    const prevValue = parseFloat(prevEntry.readings?.[label] || "0");
    if (newValue <= prevValue) {
      newErrors[`readings.${label}`] = `${label} must be > previous (${prevValue}) at ${prevEntry.timestamp} ${prevEntry.shift}.`;
    }
  }

  // Harus lebih kecil dari entri setelahnya
  if (nextEntry) {
    const nextValue = parseFloat(nextEntry.readings?.[label] || "0");
    if (newValue >= nextValue) {
      newErrors[`readings.${label}`] = `${label} must be < next (${nextValue}) at ${nextEntry.timestamp} ${nextEntry.shift}.`;
    }
  }
});

    // Jika ada error, tampilkan
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({
        title: "Validasi Gagal",
        description: "Harap isi data dengan benar.",
        variant: "destructive",
      });
      return;
    }

    // Simpan data
    const newData = {
      ...formData,
      _id: isEdit ? dataList[editIndex]._id : Date.now(),
    };

    const updatedList = isEdit
      ? dataList.map((d, i) => (i === editIndex ? newData : d))
      : [...dataList, newData];

    localStorage.setItem("energyDataMV", JSON.stringify(updatedList));
    setDataList(updatedList);
    setFormData({
      shift: "",
      timestamp: new Date().toISOString().slice(0, 10),
      meterGroup: "",
      meterSub: "",
      readings: {},
    });
    setErrors({});
    setEditIndex(null);

    toast({ title: "Sukses", description: "Data berhasil disimpan." });
  };
  
  const handleDelete = (id) => {
    const updated = dataList.filter((d) => d._id !== id);
    setDataList(updated);
    localStorage.setItem("energyDataMV", JSON.stringify(updated));
    toast({ title: "Deleted", description: "Data has been deleted." });
  };

  const handleEdit = (id) => {
    const data = dataList.find((d) => d._id === id);
    if (data) {
      setFormData({
        shift: data.shift,
        timestamp: data.timestamp,
        meterGroup: data.meterGroup,
        meterSub: data.meterSub,
        readings: data.readings,
      });
      setEditIndex(dataList.findIndex((d) => d._id === id));
    }
  };  

  const confirmDelete = () => {
    const id = dataList[confirmAction.index]?._id;
    if (id !== undefined) handleDelete(id);
    setConfirmAction({ type: "", index: null });
  };

  const confirmEdit = () => {
    const id = dataList[confirmAction.index]?._id;
    if (id !== undefined) handleEdit(id);
    setConfirmAction({ type: "", index: null });
  };

  const filteredData = dataList
    .filter((d) => {
      const matchSearch = d.meterGroup.toLowerCase().includes(filter.search.toLowerCase());
      const matchFrom = filter.from ? new Date(d.timestamp) >= new Date(filter.from) : true;
      const matchTo = filter.to ? new Date(d.timestamp) <= new Date(filter.to) : true;
      return matchSearch && matchFrom && matchTo;
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const renderReadingsInputs = () => {
    const selectedGroup = meterOptions[formData.meterGroup];
    if (!selectedGroup) return null;
  
    const handleInputChange = (label, value) => {
      if (/^[0-9]*$/.test(value)) {
        setFormData({
          ...formData,
          readings: { ...formData.readings, [label]: value },
        });
      } else {
        toast({
          title: "Input tidak valid",
          description: "Hanya angka tanpa huruf, titik, atau simbol lainnya yang diperbolehkan.",
          variant: "destructive",
        });
      }
    };
  
    if (Array.isArray(selectedGroup) && selectedGroup[0]?.children) {
      const selectedSub = selectedGroup.find((item) => item.label === formData.meterSub);
      if (!selectedSub) return null;
  
      return selectedSub.children.map((input) => {
        const label = `${formData.meterSub} - ${input.type}`;
        return (
          <div key={label}>
            <Label>{label}</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={formData.readings[label] || ""}
              onChange={(e) => handleInputChange(label, e.target.value)}
              className={errors[`readings.${label}`] ? "border-red-500" : "border-gray-300"}
            />
            {errors[`readings.${label}`] && (
              <p className="text-red-500 text-sm">{errors[`readings.${label}`]}</p>
            )}
          </div>
        );
      });
    }
  
    return selectedGroup.map((input) => (
      <div key={input.label}>
        <Label>{input.label}</Label>
        <Input
          type="text"
          inputMode="numeric"
          value={formData.readings[input.label] || ""}
          onChange={(e) => handleInputChange(input.label, e.target.value)}
          className={errors[`readings.${input.label}`] ? "border-red-500" : "border-gray-300"}
        />
        {errors[`readings.${input.label}`] && (
          <p className="text-red-500 text-sm">{errors[`readings.${input.label}`]}</p>
        )}
      </div>
    ));
  };  
  
    return (
      <div className="space-y-8">
        <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-lg bg-white shadow">
        <h2 className="text-xl font-bold">{editIndex !== null ? "Edit Medium Voltage Data" : "Input Medium Voltage Data"}</h2>
          <div>
            <Label>Shift</Label>
            <Select
              value={formData.shift}
              onValueChange={(value) => setFormData({ ...formData, shift: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Shift 1">Shift 1</SelectItem>
                <SelectItem value="Shift 2">Shift 2</SelectItem>
                <SelectItem value="Shift 3">Shift 3</SelectItem>
              </SelectContent>
            </Select>
            {errors.shift && <p className="text-red-500 text-sm">{errors.shift}</p>}
          </div>
  
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={formData.timestamp}
              onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
            />
            {errors.timestamp && <p className="text-red-500 text-sm">{errors.timestamp}</p>}
          </div>
  
          {/* Main Meter Group Dropdown */}
          <div>
            <Label>Meter Group</Label>
            <Select
              value={formData.meterGroup}
              onValueChange={(value) => {
                setFormData({ ...formData, meterGroup: value, meterSub: "", readings: {} });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Meter Group" />
              </SelectTrigger>
              <SelectContent className="max-h-40 overflow-auto">
                {Object.keys(meterOptions).map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.meterGroup && <p className="text-red-500 text-sm">{errors.meterGroup}</p>}
          </div>

          {/* Show Meter Sub Dropdown if there are children (for more detailed groups) */}
          {Array.isArray(meterOptions[formData.meterGroup]) &&
            meterOptions[formData.meterGroup][0]?.children && (
              <div>
                <Label>Meter Sub</Label>
                <Select
                  value={formData.meterSub}
                  onValueChange={(value) => {
                    setFormData({ ...formData, meterSub: value, readings: {} });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Meter Sub" />
                  </SelectTrigger>
                  {/* Add scrollable behavior to sub-dropdown */}
                  <SelectContent className="max-h-40 overflow-auto">
                    {meterOptions[formData.meterGroup].map((sub) => (
                      <SelectItem key={sub.label} value={sub.label}>
                        {sub.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.meterSub && <p className="text-red-500 text-sm">{errors.meterSub}</p>}
              </div>
            )}
          {/* Dynamic readings inputs */}
          {renderReadingsInputs()}
  
          <Button type="submit" className="w-full">{editIndex !== null ? "Update Data" : "Save Data"}</Button>

          <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Data is Available</DialogTitle>
              </DialogHeader>
              <p>
              Data with the same combination of <strong>Date, Shift, and Meter </strong>
              already exists. Please change your entry.
              </p>
              <DialogFooter>
                <Button onClick={() => setShowDuplicateDialog(false)}>OK</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </form>
  
        {/* Data Table (Optional for visualizing the inputs, not shown above) */}
        {/* Table */}
        <div className="space-y-4 p-6 rounded-lg bg-white shadow">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <h2 className="text-xl font-bold">Medium Voltage Data Record</h2>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Search detail..."
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              />
              <Input
                type="date"
                value={filter.from}
                onChange={(e) => setFilter({ ...filter, from: e.target.value })}
              />
              <Input
                type="date"
                value={filter.to}
                onChange={(e) => setFilter({ ...filter, to: e.target.value })}
              />
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
                  <th className="px-4 py-2 text-left">Stand kVARh</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.flatMap((d, index) => {
                  const readings = d.readings || {};
                  const rows = [];

                  if (d.meterGroup?.includes("20kV MV-I Nat Grid")) {
                    const kWhValues = [];
                    const kVarhValues = [];

                    Object.entries(readings).forEach(([label, value]) => {
                      if (value != null && value !== "") {
                        if (label.toLowerCase().includes("kwh")) kWhValues.push(value);
                        else if (label.toLowerCase().includes("kvarh")) kVarhValues.push(value);
                      }
                    });

                    if (kWhValues.length > 0 || kVarhValues.length > 0) {
                      rows.push(
                        <tr key={index} className="border-b">
                          <td className="px-4 py-2">{new Date(d.timestamp).toLocaleDateString()}</td>
                          <td className="px-4 py-2">{d.shift.replace("Shift ", "")}</td>
                          <td className="px-4 py-2">{d.meterGroup}</td>
                          <td className="px-4 py-2">-</td>
                          <td className="px-4 py-2">{kWhValues.join(", ")}</td>
                          <td className="px-4 py-2">{kVarhValues.join(", ")}</td>
                          <td className="px-4 py-2">
                            <Button onClick={() => handleEdit(d._id)} variant="outline">Edit</Button>
                            <Button
                              onClick={() =>
                                setConfirmAction({
                                  type: "delete",
                                  index: dataList.findIndex(item => item._id === d._id),
                                })
                              }
                              variant="destructive"
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      );
                    }
                  } else if (d.meterGroup === "Reading @Out Going Trafo") {
                    const kWhValues = [];
                    const kVarhValues = [];

                    Object.entries(readings).forEach(([label, value]) => {
                      if (value != null && value !== "") {
                        if (label.toLowerCase().includes("kwh")) kWhValues.push(value);
                        else if (label.toLowerCase().includes("kvarh")) kVarhValues.push(value);
                      }
                    });

                    if (kWhValues.length > 0 || kVarhValues.length > 0) {
                      rows.push(
                        <tr key={index} className="border-b">
                          <td className="px-4 py-2">{new Date(d.timestamp).toLocaleDateString()}</td>
                          <td className="px-4 py-2">{d.shift.replace("Shift ", "")}</td>
                          <td className="px-4 py-2">{d.meterGroup}</td>
                          <td className="px-4 py-2">{d.meterSub || "-"}</td>
                          <td className="px-4 py-2">{kWhValues.join(", ")}</td>
                          <td className="px-4 py-2">{kVarhValues.join(", ")}</td>
                          <td className="px-4 py-2">
                            <Button onClick={() => handleEdit(d._id)} variant="outline">Edit</Button>
                            <Button
                              onClick={() =>
                                setConfirmAction({
                                  type: "delete",
                                  index: dataList.findIndex(item => item._id === d._id),
                                })
                              }
                              variant="destructive"
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      );
                    }
                  } else if (d.meterGroup === "20kV GARDU PLN") {
                    Object.entries(readings).forEach(([label, value]) => {
                      if (value != null && value !== "") {
                        rows.push(
                          <tr key={`${index}-${label}`} className="border-b">
                            <td className="px-4 py-2">{new Date(d.timestamp).toLocaleDateString()}</td>
                            <td className="px-4 py-2">{d.shift.replace("Shift ", "")}</td>
                            <td className="px-4 py-2">{d.meterGroup}</td>
                            <td className="px-4 py-2">{label}</td>
                            <td className="px-4 py-2">{label.toLowerCase().includes("kwh") ? value : "-"}</td>
                            <td className="px-4 py-2">{label.toLowerCase().includes("kvarh") ? value : "-"}</td>
                            <td className="px-4 py-2">
                              <Button onClick={() => handleEdit(d._id)} variant="outline">Edit</Button>
                              <Button
                                onClick={() =>
                                  setConfirmAction({
                                    type: "delete",
                                    index: dataList.findIndex(item => item._id === d._id),
                                  })
                                }
                                variant="destructive"
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        );
                      }
                    });
                  }

                  return rows;
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between mt-4">
            <div>
              Showing {paginatedData.length} of {filteredData.length} records
            </div>
            <div className="flex gap-2">
              <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Dialog for confirmation (edit/delete) */}
        <Dialog open={!!confirmAction.type} onOpenChange={() => setConfirmAction({ type: "", index: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {confirmAction.type === "delete" ? "Confirm Deletion" : "Confirm Edit"}
              </DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to {confirmAction.type} this entry?</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmAction({ type: "", index: null })}>
                Cancel
              </Button>
              <Button
                variant="destructive" onClick={confirmAction.type === "delete" ? confirmDelete : confirmEdit}>
                Yes, {confirmAction.type}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }