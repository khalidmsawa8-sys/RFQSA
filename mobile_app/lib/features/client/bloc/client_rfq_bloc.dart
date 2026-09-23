import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:rfqsa_mobile/features/client/models/rfq_model.dart';
import 'package:rfqsa_mobile/features/client/models/vehicle_model.dart';
import 'package:rfqsa_mobile/features/client/repositories/client_repository.dart';

// Events
abstract class ClientRfqEvent extends Equatable {
  const ClientRfqEvent();
  @override
  List<Object?> get props => [];
}

class LoadClientRfqsEvent extends ClientRfqEvent {}

class CreateRfqSubmittedEvent extends ClientRfqEvent {
  final String carMake;
  final String carModel;
  final int carYear;
  final String? plateNumber;
  final String? vin;
  final String partsCategory;
  final String partsCategoryName;
  final List<RfqItemModel> items;
  final String rfqType;
  final String? selectedVendorId;
  final String? selectedVendorName;
  final String? selectedVendorBranchId;
  final String deliveryMethod;
  final String? notes;
  final bool isUrgent;
  final String deliveryLocation;
  final String deliveryCity;
  final String? deliveryDistrict;
  final String? recipientName;
  final String? recipientPhone;
  final double? deliveryLat;
  final double? deliveryLng;

  const CreateRfqSubmittedEvent({
    required this.carMake,
    required this.carModel,
    required this.carYear,
    this.plateNumber,
    this.vin,
    this.partsCategory = 'all',
    this.partsCategoryName = 'عام (كافة التخصصات)',
    required this.items,
    this.rfqType = 'public',
    this.selectedVendorId,
    this.selectedVendorName,
    this.selectedVendorBranchId,
    this.deliveryMethod = 'delivery',
    this.notes,
    this.isUrgent = false,
    required this.deliveryLocation,
    required this.deliveryCity,
    this.deliveryDistrict,
    this.recipientName,
    this.recipientPhone,
    this.deliveryLat,
    this.deliveryLng,
  });

  @override
  List<Object?> get props => [
        carMake,
        carModel,
        carYear,
        plateNumber,
        vin,
        partsCategory,
        items,
        rfqType,
        selectedVendorId,
        deliveryMethod,
      ];
}

class AcceptQuoteSubmittedEvent extends ClientRfqEvent {
  final String rfqId;
  final String quoteId;
  final String vendorId;
  final double totalPrice;
  final List<dynamic> items;

  const AcceptQuoteSubmittedEvent({
    required this.rfqId,
    required this.quoteId,
    required this.vendorId,
    required this.totalPrice,
    required this.items,
  });

  @override
  List<Object?> get props => [rfqId, quoteId, vendorId, totalPrice];
}

// States
abstract class ClientRfqState extends Equatable {
  const ClientRfqState();
  @override
  List<Object?> get props => [];
}

class ClientRfqInitialState extends ClientRfqState {}

class ClientRfqLoadingState extends ClientRfqState {}

class ClientRfqsLoadedState extends ClientRfqState {
  final List<RfqModel> rfqs;
  final List<VehicleModel> vehicles;

  const ClientRfqsLoadedState({required this.rfqs, this.vehicles = const []});

  @override
  List<Object?> get props => [rfqs, vehicles];
}

class ClientRfqSuccessState extends ClientRfqState {
  final String message;
  const ClientRfqSuccessState({required this.message});
  @override
  List<Object?> get props => [message];
}

class ClientRfqErrorState extends ClientRfqState {
  final String error;
  const ClientRfqErrorState({required this.error});
  @override
  List<Object?> get props => [error];
}

// BLoC Implementation
class ClientRfqBloc extends Bloc<ClientRfqEvent, ClientRfqState> {
  final ClientRepository _repository;

  ClientRfqBloc({required ClientRepository repository})
      : _repository = repository,
        super(ClientRfqInitialState()) {
    on<LoadClientRfqsEvent>(_onLoadClientRfqs);
    on<CreateRfqSubmittedEvent>(_onCreateRfqSubmitted);
    on<AcceptQuoteSubmittedEvent>(_onAcceptQuoteSubmitted);
  }

  Future<void> _onLoadClientRfqs(LoadClientRfqsEvent event, Emitter<ClientRfqState> emit) async {
    emit(ClientRfqLoadingState());
    final rfqRes = await _repository.fetchMyRfqs();
    final vehicleRes = await _repository.fetchVehicles();

    if (rfqRes.success) {
      emit(ClientRfqsLoadedState(
        rfqs: rfqRes.data ?? [],
        vehicles: vehicleRes.data ?? [],
      ));
    } else {
      emit(ClientRfqErrorState(error: rfqRes.error ?? 'فشل تحميل طلباتك'));
    }
  }

  Future<void> _onCreateRfqSubmitted(CreateRfqSubmittedEvent event, Emitter<ClientRfqState> emit) async {
    emit(ClientRfqLoadingState());

    final res = await _repository.createRfq(
      carMake: event.carMake,
      carModel: event.carModel,
      carYear: event.carYear,
      plateNumber: event.plateNumber,
      vin: event.vin,
      partsCategory: event.partsCategory,
      partsCategoryName: event.partsCategoryName,
      items: event.items,
      rfqType: event.rfqType,
      selectedVendorId: event.selectedVendorId,
      selectedVendorName: event.selectedVendorName,
      selectedVendorBranchId: event.selectedVendorBranchId,
      deliveryMethod: event.deliveryMethod,
      notes: event.notes,
      isUrgent: event.isUrgent,
      deliveryLocation: event.deliveryLocation,
      deliveryCity: event.deliveryCity,
      deliveryDistrict: event.deliveryDistrict,
      recipientName: event.recipientName,
      recipientPhone: event.recipientPhone,
      deliveryLat: event.deliveryLat,
      deliveryLng: event.deliveryLng,
    );

    if (res.success) {
      emit(const ClientRfqSuccessState(message: 'تم إرسال طلب التسعير بنجاح للموردين المعتمدين 🚀'));
      add(LoadClientRfqsEvent());
    } else {
      emit(ClientRfqErrorState(error: res.error ?? 'فشل إرسال طلب التسعير'));
    }
  }

  Future<void> _onAcceptQuoteSubmitted(AcceptQuoteSubmittedEvent event, Emitter<ClientRfqState> emit) async {
    emit(ClientRfqLoadingState());

    final res = await _repository.acceptQuote(
      rfqId: event.rfqId,
      quoteId: event.quoteId,
      vendorId: event.vendorId,
      totalPrice: event.totalPrice,
      items: event.items,
    );

    if (res.success) {
      emit(const ClientRfqSuccessState(message: 'تم تأكيد الصفقة وإنشاء الفاتورة وتعيين التوصيل بنجاح 🎉'));
      add(LoadClientRfqsEvent());
    } else {
      emit(ClientRfqErrorState(error: res.error ?? 'فشل قبول العرض'));
    }
  }
}
