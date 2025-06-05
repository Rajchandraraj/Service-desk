// frontend/src/components/VmView.jsx

export default function VmView({ vms, selected, setSelected, subscriptionName }) {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* VM List */}
      <div className="w-full lg:w-1/3">
        <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
            <h2 className="text-base font-medium text-gray-800">
              Virtual Machines <span className="text-gray-500 text-sm">({vms.length})</span>
            </h2>
          </div>
          <div className="p-2">
            {vms.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">No virtual machines found.</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {vms.map((vm) => (
                  <li
                    key={vm.name}
                    onClick={() => setSelected(vm)}
                    className={`px-3 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selected?.name === vm.name ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-center">
                      <div
                        className={`h-2 w-2 rounded-full mr-3 ${selected?.name === vm.name ? "bg-blue-600" : "bg-gray-400"}`}
                      ></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{vm.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{vm.resourceGroup}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* VM Details */}
      <div className="w-full lg:w-2/3">
        <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden h-full">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
            <h2 className="text-base font-medium text-gray-800">VM Details</h2>
          </div>
          <div className="p-4">
            {selected ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Overview</h3>
                  <div className="mt-2 grid grid-cols-1 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">VM Name: {selected.name}</p>
                        <p className="text-sm text-gray-600">Resource Group: {selected.resourceGroup}</p>
                        <p className="text-sm text-gray-600">Status: {selected.powerState || "Unknown"}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Subscription: {selected.subscriptionId || subscriptionName}</p>
                    </div>
                    </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-center text-gray-500">Select a virtual machine to view details.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
